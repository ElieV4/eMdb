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
        data: { list_id: listId, shared_with_user_id: userB, permission: 'lecture' },
      }),
    );

    const afterShare = await forUser<any>(userB, (tx) => tx.user_lists.findUnique({ where: { id: listId } }));
    expect(afterShare?.id).toBe(listId);

    await asSystem(async (tx) => {
      await tx.list_shares.deleteMany({ where: { list_id: listId } });
      await tx.user_lists.deleteMany({ where: { id: listId } });
    });
  });
});
