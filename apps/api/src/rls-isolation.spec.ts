import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Preuve d'isolation RLS de bout en bout (migration
 * enable_rls_user_scoped_tables), contre la vraie base — pas de mock Prisma.
 *
 * N'a de sens que si DATABASE_URL pointe vers le rôle restreint `emdb_app`
 * (sans BYPASSRLS, cf. packages/db/sql/setup_roles.sql) : avec le rôle
 * superuser par défaut, ce test passerait même si les policies RLS
 * n'existaient pas (superuser bypass toujours RLS), ce qui ne prouverait
 * rien. Skip silencieux si emdb_app n'existe pas encore (ex. environnement
 * pas encore migré vers deux rôles distincts).
 */

function loadEnv(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1);
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

loadEnv(path.resolve(__dirname, '../../../.env'));

const { prisma } = require('@emdb/db') as typeof import('@emdb/db');

async function forUser<T>(userId: string, fn: (tx: any) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx: any) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}

async function asSystem<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx: any) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'true', true)`;
    return fn(tx);
  });
}

describe('RLS — isolation entre utilisateurs (bout en bout, base réelle)', () => {
  const userA = randomUUID();
  const userB = randomUUID();
  const titleId = randomUUID();
  let usingRestrictedRole = false;

  beforeAll(async () => {
    await prisma.$connect();

    const [role] = await prisma.$queryRawUnsafe<{ rolbypassrls: boolean }[]>(
      `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    );
    usingRestrictedRole = role ? role.rolbypassrls === false : false;

    if (!usingRestrictedRole) {
      return;
    }

    await asSystem(async (tx) => {
      await tx.users.create({
        data: { id: userA, email: `rls-a-${userA}@example.com`, password_hash: 'x', pseudo: `rls-a-${userA}` },
      });
      await tx.users.create({
        data: { id: userB, email: `rls-b-${userB}@example.com`, password_hash: 'x', pseudo: `rls-b-${userB}` },
      });
      await tx.titles.create({
        data: { id: titleId, type: 'film', titre_vo: `RLS test film ${titleId}` },
      });
      await tx.user_watches.create({
        data: { user_id: userA, title_id: titleId, date_vue: new Date() },
      });
      await tx.user_ratings.create({
        data: { user_id: userA, title_id: titleId, note_perso: 8 },
      });
    });
  });

  afterAll(async () => {
    if (!usingRestrictedRole) {
      await prisma.$disconnect();
      return;
    }
    await asSystem(async (tx) => {
      await tx.user_ratings.deleteMany({ where: { user_id: { in: [userA, userB] } } });
      await tx.user_watches.deleteMany({ where: { user_id: { in: [userA, userB] } } });
      await tx.titles.deleteMany({ where: { id: titleId } });
      await tx.users.deleteMany({ where: { id: { in: [userA, userB] } } });
    });
    await prisma.$disconnect();
  });

  // beforeAll() détermine usingRestrictedRole de façon asynchrone, alors que
  // Jest construit l'arbre des tests en évaluant describe/it de façon
  // synchrone AVANT que beforeAll ne s'exécute — un `it.skip` conditionné
  // sur usingRestrictedRole verrait donc toujours sa valeur initiale
  // (false). Chaque test se garde donc lui-même au runtime à la place.
  function skipIfNotRestricted(): boolean {
    if (!usingRestrictedRole) {
      // eslint-disable-next-line no-console
      console.warn(
        '[rls-isolation.spec] DATABASE_URL ne pointe pas vers un rôle sans BYPASSRLS (emdb_app) — test ignoré (ne prouve rien avec un rôle superuser/bypass).',
      );
      return true;
    }
    return false;
  }

  it('sans contexte : aucune ligne visible (fermé par défaut)', async () => {
    if (skipIfNotRestricted()) return;
    const watches = await prisma.user_watches.findMany({ where: { user_id: userA } });
    expect(watches).toHaveLength(0);
  });

  it("forUser(A) : voit ses propres visionnages, pas ceux d'un autre user_id", async () => {
    if (skipIfNotRestricted()) return;
    const watches = await forUser(userA, (tx) => tx.user_watches.findMany({ where: { title_id: titleId } }));
    expect(watches).toHaveLength(1);
    expect(watches[0].user_id).toBe(userA);
  });

  it('forUser(B) : ne voit PAS les visionnages/notes de A', async () => {
    if (skipIfNotRestricted()) return;
    const watches = await forUser(userB, (tx) => tx.user_watches.findMany({ where: { title_id: titleId } }));
    const ratings = await forUser(userB, (tx) => tx.user_ratings.findMany({ where: { title_id: titleId } }));
    expect(watches).toHaveLength(0);
    expect(ratings).toHaveLength(0);
  });

  it('forUser(B) ne peut pas écrire une ligne au nom de A (WITH CHECK)', async () => {
    if (skipIfNotRestricted()) return;
    await expect(
      forUser(userB, (tx) =>
        tx.user_ratings.create({ data: { user_id: userA, title_id: titleId, note_perso: 1 } }),
      ),
    ).rejects.toThrow();
  });

  it('asSystem() voit tout, indépendamment du user_id', async () => {
    if (skipIfNotRestricted()) return;
    const watches = await asSystem<any[]>((tx) => tx.user_watches.findMany({ where: { title_id: titleId } }));
    expect(watches.length).toBeGreaterThanOrEqual(1);
  });

  it('partage de liste : B voit une liste de A une fois partagée, pas avant', async () => {
    if (skipIfNotRestricted()) return;
    const listId = randomUUID();
    await asSystem((tx) =>
      tx.user_lists.create({ data: { id: listId, user_id: userA, nom: 'Liste RLS test', type: 'custom' } }),
    );

    const beforeShare = await forUser(userB, (tx) => tx.user_lists.findUnique({ where: { id: listId } }));
    expect(beforeShare).toBeNull();

    await asSystem((tx) =>
      tx.list_shares.create({
        data: { list_id: listId, shared_with_user_id: userB },
      }),
    );

    const afterShare = await forUser<any>(userB, (tx) => tx.user_lists.findUnique({ where: { id: listId } }));
    expect(afterShare?.id).toBe(listId);

    await asSystem(async (tx) => {
      await tx.list_shares.deleteMany({ where: { list_id: listId } });
      await tx.user_lists.deleteMany({ where: { id: listId } });
    });
  });

  // ------------------------------------------------------------------
  // Modes de partage (migration list_share_modes, fn_list_can) : A crée
  // une liste contenant `titleId`, B en est membre dans le mode testé.
  // Ces tests passent volontairement à côté du service pour prouver que la
  // base refuse d'elle-même ce que le mode interdit.
  // ------------------------------------------------------------------
  describe('modes de partage', () => {
    const otherTitleId = randomUUID();
    let listId: string;

    async function createSharedList(shareMode: 'lecture' | 'collaboratif' | 'ouvert') {
      listId = randomUUID();
      await asSystem(async (tx) => {
        await tx.user_lists.create({
          data: { id: listId, user_id: userA, nom: `RLS ${shareMode}`, type: 'custom', share_mode: shareMode },
        });
        await tx.list_items.create({ data: { list_id: listId, title_id: titleId, position: 0 } });
        await tx.list_shares.create({ data: { list_id: listId, shared_with_user_id: userB } });
      });
    }

    beforeAll(async () => {
      if (!usingRestrictedRole) return;
      await asSystem((tx) =>
        tx.titles.create({ data: { id: otherTitleId, type: 'film', titre_vo: `RLS other ${otherTitleId}` } }),
      );
    });

    afterEach(async () => {
      if (!usingRestrictedRole || !listId) return;
      await asSystem((tx) => tx.user_lists.deleteMany({ where: { id: listId } }));
    });

    afterAll(async () => {
      if (!usingRestrictedRole) return;
      await asSystem((tx) => tx.titles.deleteMany({ where: { id: otherTitleId } }));
    });

    const addItemAsB = () =>
      forUser(userB, (tx) =>
        tx.list_items.create({ data: { list_id: listId, title_id: otherTitleId, position: 1 } }),
      );
    const removeItemAsB = () =>
      forUser(userB, (tx) => tx.list_items.deleteMany({ where: { list_id: listId, title_id: titleId } }));
    const renameAsB = () =>
      forUser(userB, (tx) => tx.user_lists.updateMany({ where: { id: listId }, data: { nom: 'Renommée par B' } }));
    const updateStatutAsB = () =>
      forUser(userB, (tx) =>
        tx.list_items.updateMany({ where: { list_id: listId, title_id: titleId }, data: { statut: 'a_jour' } }),
      );

    it('lecture : B lit les titres, ne peut ni ajouter, ni retirer, ni modifier', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('lecture');

      const items = await forUser<any[]>(userB, (tx) => tx.list_items.findMany({ where: { list_id: listId } }));
      expect(items).toHaveLength(1);

      await expect(addItemAsB()).rejects.toThrow();
      expect(((await removeItemAsB()) as any).count).toBe(0);
      expect(((await renameAsB()) as any).count).toBe(0);
      expect(((await updateStatutAsB()) as any).count).toBe(0);
    });

    it('collaboratif : B renomme et change un statut, mais ne peut ni ajouter ni retirer', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('collaboratif');

      expect(((await renameAsB()) as any).count).toBe(1);
      expect(((await updateStatutAsB()) as any).count).toBe(1);
      await expect(addItemAsB()).rejects.toThrow();
      expect(((await removeItemAsB()) as any).count).toBe(0);
    });

    it('collaboratif : B ne peut pas changer le mode de partage (trigger)', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('collaboratif');

      await expect(
        forUser(userB, (tx) => tx.user_lists.updateMany({ where: { id: listId }, data: { share_mode: 'ouvert' } })),
      ).rejects.toThrow();
    });

    it('ouvert : B ajoute et retire des titres, mais ne peut pas supprimer la liste', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('ouvert');

      await expect(addItemAsB()).resolves.toBeDefined();
      expect(((await removeItemAsB()) as any).count).toBe(1);

      const deleted = await forUser<any>(userB, (tx) => tx.user_lists.deleteMany({ where: { id: listId } }));
      expect(deleted.count).toBe(0);
    });

    it('ouvert : B ne peut pas ajouter un autre membre', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('ouvert');

      await expect(
        forUser(userB, (tx) => tx.list_shares.create({ data: { list_id: listId, shared_with_user_id: userA } })),
      ).rejects.toThrow();
    });

    it('list_shares : B ne voit que sa propre appartenance et peut quitter la liste', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('lecture');

      const visible = await forUser<any[]>(userB, (tx) => tx.list_shares.findMany({ where: { list_id: listId } }));
      expect(visible.map((s) => s.shared_with_user_id)).toEqual([userB]);

      const left = await forUser<any>(userB, (tx) =>
        tx.list_shares.deleteMany({ where: { list_id: listId, shared_with_user_id: userB } }),
      );
      expect(left.count).toBe(1);

      const afterLeave = await forUser(userB, (tx) => tx.user_lists.findUnique({ where: { id: listId } }));
      expect(afterLeave).toBeNull();
    });

    // Vu partagé et sous-groupes (migration list_items_vu_and_groups).
    const markVuAsB = () =>
      forUser(userB, (tx) =>
        tx.list_items.updateMany({
          where: { list_id: listId, title_id: titleId },
          data: { vu_at: new Date(), vu_by: userB },
        }),
      );
    const createGroupAsB = () =>
      forUser(userB, (tx) => tx.list_groups.create({ data: { list_id: listId, nom: 'Sport' } }));

    it('vu et sous-groupes en lecture : B lit, ne marque rien, ne crée ni ne range rien', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('lecture');
      const groupId = randomUUID();
      await asSystem((tx) => tx.list_groups.create({ data: { id: groupId, list_id: listId, nom: 'Sport' } }));

      const groups = await forUser<any[]>(userB, (tx) => tx.list_groups.findMany({ where: { list_id: listId } }));
      expect(groups).toHaveLength(1);
      expect(((await markVuAsB()) as any).count).toBe(0);
      await expect(createGroupAsB()).rejects.toThrow();
      await expect(
        forUser(userB, (tx) =>
          tx.list_item_groups.create({ data: { list_id: listId, title_id: titleId, group_id: groupId } }),
        ),
      ).rejects.toThrow();
    });

    it('collaboratif : B marque vu (visible par A) et range un titre, mais ne crée pas de sous-groupe', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('collaboratif');
      const groupId = randomUUID();
      await asSystem((tx) => tx.list_groups.create({ data: { id: groupId, list_id: listId, nom: 'Sport' } }));

      expect(((await markVuAsB()) as any).count).toBe(1);
      const seenByA = await forUser<any>(userA, (tx) =>
        tx.list_items.findUnique({ where: { list_id_title_id: { list_id: listId, title_id: titleId } } }),
      );
      expect(seenByA.vu_by).toBe(userB);

      await expect(
        forUser(userB, (tx) =>
          tx.list_item_groups.create({ data: { list_id: listId, title_id: titleId, group_id: groupId } }),
        ),
      ).resolves.toBeDefined();
      await expect(createGroupAsB()).rejects.toThrow();
    });

    it('ouvert : B crée et supprime des sous-groupes ; la suppression emporte les enfants', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('ouvert');

      const sport = await forUser<any>(userB, (tx) =>
        tx.list_groups.create({ data: { list_id: listId, nom: 'Sport' } }),
      );
      await forUser(userB, (tx) =>
        tx.list_groups.create({ data: { list_id: listId, parent_id: sport.id, nom: 'Tennis' } }),
      );

      const deleted = await forUser<any>(userB, (tx) => tx.list_groups.deleteMany({ where: { id: sport.id } }));
      expect(deleted.count).toBe(1);
      const left = await asSystem<any[]>((tx) => tx.list_groups.findMany({ where: { list_id: listId } }));
      expect(left).toHaveLength(0);
    });

    it("un sous-groupe ne peut pas avoir pour parent un groupe d'une autre liste (FK composite)", async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('ouvert');
      const otherList = randomUUID();
      const foreignGroup = randomUUID();
      await asSystem(async (tx) => {
        await tx.user_lists.create({ data: { id: otherList, user_id: userA, nom: 'Autre', type: 'custom' } });
        await tx.list_groups.create({ data: { id: foreignGroup, list_id: otherList, nom: 'Ailleurs' } });
      });

      await expect(
        forUser(userA, (tx) =>
          tx.list_groups.create({ data: { list_id: listId, parent_id: foreignGroup, nom: 'Intrus' } }),
        ),
      ).rejects.toThrow();

      await asSystem((tx) => tx.user_lists.deleteMany({ where: { id: otherList } }));
    });

    // Fil de commentaires partagés (migration title_comments).
    const commentAsB = (authorId: string = userB) =>
      forUser(userB, (tx) =>
        tx.list_item_comments.create({
          data: { list_id: listId, title_id: titleId, user_id: authorId, contenu: 'Avis de B' },
        }),
      );

    it('commentaires en lecture : B lit le fil mais ne peut pas commenter', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('lecture');
      await asSystem((tx) =>
        tx.list_item_comments.create({
          data: { list_id: listId, title_id: titleId, user_id: userA, contenu: 'Avis de A' },
        }),
      );

      const visible = await forUser<any[]>(userB, (tx) =>
        tx.list_item_comments.findMany({ where: { list_id: listId } }),
      );
      expect(visible.map((c) => c.contenu)).toEqual(['Avis de A']);
      await expect(commentAsB()).rejects.toThrow();
    });

    it("commentaires en collaboratif : B commente en son nom, pas au nom de A, ni ne modifie ceux de A ; A modère", async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('collaboratif');
      const fromA = await asSystem<any>((tx) =>
        tx.list_item_comments.create({
          data: { list_id: listId, title_id: titleId, user_id: userA, contenu: 'Avis de A' },
        }),
      );

      const mine = await commentAsB();
      expect((mine as any).user_id).toBe(userB);
      await expect(commentAsB(userA)).rejects.toThrow();

      const edited = await forUser<any>(userB, (tx) =>
        tx.list_item_comments.updateMany({ where: { id: fromA.id }, data: { contenu: 'Piraté' } }),
      );
      expect(edited.count).toBe(0);

      const moderated = await forUser<any>(userA, (tx) =>
        tx.list_item_comments.deleteMany({ where: { id: (mine as any).id } }),
      );
      expect(moderated.count).toBe(1);
    });

    it('A (créateur) garde tous les droits, y compris changer le mode', async () => {
      if (skipIfNotRestricted()) return;
      await createSharedList('lecture');

      const updated = await forUser<any>(userA, (tx) =>
        tx.user_lists.update({ where: { id: listId }, data: { share_mode: 'ouvert' } }),
      );
      expect(updated.share_mode).toBe('ouvert');

      const created = await forUser<any>(userA, (tx) =>
        tx.list_items.create({ data: { list_id: listId, title_id: otherTitleId, position: 1 } }),
      );
      expect(created.title_id).toBe(otherTitleId);
    });
  });
});
