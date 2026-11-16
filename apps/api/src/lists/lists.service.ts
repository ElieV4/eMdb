import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { ReorderDto } from './dto/reorder.dto';
import { ShareListDto } from './dto/share-list.dto';
import { UpdateShareModeDto } from './dto/update-share-mode.dto';
import {
  ListAction,
  ListRole,
  NON_SHAREABLE_LIST_TYPES,
  ShareMode,
  canOnList,
  listCapabilities,
} from './list-permissions';

/** Champs d'une liste nécessaires pour évaluer les droits. */
const LIST_ACCESS_SELECT = {
  id: true,
  user_id: true,
  nom: true,
  type: true,
  description: true,
  share_mode: true,
  created_at: true,
} as const;

const USER_PUBLIC_SELECT = { id: true, pseudo: true, avatar_url: true } as const;

/** Message renvoyé quand le rôle ou le mode de partage interdit l'action. */
const FORBIDDEN_MESSAGES: Record<ListAction, string> = {
  read: "Vous n'avez pas accès à cette liste.",
  'item:add': "Le mode de partage de cette liste ne permet pas d'ajouter des titres.",
  'item:remove': 'Le mode de partage de cette liste ne permet pas de retirer des titres.',
  'item:update': 'Cette liste est partagée en lecture seule.',
  'list:update': 'Cette liste est partagée en lecture seule.',
  'list:delete': 'Seul le créateur peut supprimer cette liste.',
  'shares:manage': 'Seul le créateur peut gérer le partage de cette liste.',
};

/**
 * Service métier pour le module lists (Phase 4.3).
 *
 * Gère :
 * - Les listes utilisateur (user_lists) : CRUD
 * - Les items de liste (list_items) : ajout, retrait, réordonnancement
 * - Les partages de liste (list_shares) : partage, consultation, retrait
 * - Les listes partagées avec l'utilisateur (shared-lists)
 *
 * Logique d'accès : voir `list-permissions.ts`. Le créateur
 * (user_lists.user_id) a tous les droits ; un membre (list_shares) a les
 * droits du mode de partage de la liste (user_lists.share_mode). La même
 * matrice est appliquée en base par RLS (fn_list_can).
 */
@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  // ======================================================================
  // UTILITAIRES D'ACCÈS
  // ======================================================================

  /**
   * Charge une liste et le rôle de l'utilisateur sur celle-ci.
   *
   * `forUser` scope la visibilité RLS (créateur ou membre) : une liste d'un
   * autre utilisateur non partagée avec lui est invisible et remonte en
   * NotFound plutôt que Forbidden (pas de fuite d'existence). Le rôle 'none'
   * ne se rencontre donc qu'avec un rôle de connexion qui contourne la RLS.
   *
   * @throws NotFoundException si la liste n'existe pas (ou est invisible)
   */
  private async getListAccess(listId: string, userId: string) {
    const { list, isMember } = await this.prisma.forUser(userId, async (tx) => {
      const list = await tx.user_lists.findUnique({
        where: { id: listId },
        select: LIST_ACCESS_SELECT,
      });

      if (!list || list.user_id === userId) {
        return { list, isMember: false };
      }

      const share = await tx.list_shares.findUnique({
        where: {
          list_id_shared_with_user_id: { list_id: listId, shared_with_user_id: userId },
        },
        select: { list_id: true },
      });

      return { list, isMember: share !== null };
    });

    if (!list) {
      throw new NotFoundException('Liste introuvable.');
    }

    const role: ListRole = list.user_id === userId ? 'owner' : isMember ? 'member' : 'none';

    return { ...list, share_mode: list.share_mode as ShareMode, role };
  }

  /**
   * Vérifie que l'utilisateur peut effectuer `action` sur la liste.
   *
   * @returns La liste avec le rôle de l'utilisateur
   * @throws NotFoundException si la liste n'existe pas
   * @throws ForbiddenException si le rôle ou le mode de partage l'interdit
   */
  private async assertCan(listId: string, userId: string, action: ListAction) {
    const access = await this.getListAccess(listId, userId);

    if (access.role === 'none') {
      throw new ForbiddenException(FORBIDDEN_MESSAGES.read);
    }

    if (!canOnList(access.role, access.share_mode, action)) {
      throw new ForbiddenException(FORBIDDEN_MESSAGES[action]);
    }

    return access;
  }

  // ======================================================================
  // USER_LISTS
  // ======================================================================

  /**
   * POST /lists
   * Crée une nouvelle liste pour l'utilisateur connecté.
   *
   * Idempotent pour `watchlist`/`favoris` : un utilisateur ne peut avoir qu'une
   * seule liste de chacun de ces deux types (créées automatiquement à
   * l'inscription, cf. `useRegister()` côté frontend). Si une liste de ce type
   * existe déjà, elle est retournée telle quelle plutôt que d'en créer une
   * deuxième — évite les doublons en cas de double appel (bug #42).
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param dto - Données de la liste
   * @returns La liste créée, ou la liste existante si `type` est `watchlist`/`favoris` et qu'une existe déjà
   */
  async createList(userId: string, dto: CreateListDto) {
    return this.prisma.forUser(userId, async (tx) => {
      if (dto.type === 'watchlist' || dto.type === 'favoris') {
        const existing = await tx.user_lists.findFirst({
          where: { user_id: userId, type: dto.type },
          orderBy: { created_at: 'asc' },
        });
        if (existing) {
          return existing;
        }
      }

      return tx.user_lists.create({
        data: {
          user_id: userId,
          nom: dto.nom,
          type: dto.type,
          description: dto.description ?? null,
          ...(dto.share_mode ? { share_mode: dto.share_mode } : {}),
        },
      });
    });
  }

  /**
   * GET /lists
   * Liste des listes de l'utilisateur connecté.
   *
   * Inclut, pour chaque liste, un tableau `items` allégé (type/année/note/genres/pays,
   * pas les champs d'affichage) permettant de filtrer côté frontend quelles listes
   * contiennent au moins un titre correspondant aux filtres actifs du header —
   * sans avoir à récupérer le détail complet de chaque liste (bug filtres header).
   *
   * @param userId - UUID de l'utilisateur connecté
   * @returns Tableau des listes
   */
  async getUserLists(userId: string) {
    const lists = await this.prisma.forUser(userId, (tx) =>
      tx.user_lists.findMany({
        where: { user_id: userId },
        include: {
          // list_shares : nombre de membres, pour afficher "partagée avec N".
          _count: {
            select: { list_items: true, list_shares: true },
          },
          list_items: {
            select: {
              statut: true,
              titles: {
                select: {
                  id: true,
                  type: true,
                  date_sortie: true,
                  note_imdb: true,
                  title_genres: { select: { genre_id: true } },
                  title_countries: { select: { country_id: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    );

    return lists.map(({ list_items, ...list }) => ({
      ...list,
      items: list_items.map((item) => ({
        titleId: item.titles.id,
        type: item.titles.type,
        year: item.titles.date_sortie ? item.titles.date_sortie.getFullYear() : null,
        note: item.titles.note_imdb ? Number(item.titles.note_imdb) : null,
        genreIds: item.titles.title_genres.map((g) => g.genre_id),
        countryIds: item.titles.title_countries.map((c) => c.country_id),
        statut: (item as any).statut,
      })),
    }));
  }

  /**
   * GET /lists?title_id=xxx
   * Listes dans lesquelles l'utilisateur peut ajouter un titre, avec un flag
   * indiquant si le titre y est déjà : ses propres listes, plus les listes
   * partagées avec lui en mode 'ouvert' (marquées `shared: true`, avec leur
   * créateur). C'est ce qui alimente le menu "ajouter à une liste".
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param titleId - UUID du titre à vérifier
   * @returns Tableau des listes avec `contains_title: boolean`
   */
  async getUserListsWithTitleCheck(userId: string, titleId: string) {
    const ownLists = await this.getUserLists(userId);

    const editableShares = await this.prisma.forUser(userId, (tx) =>
      tx.list_shares.findMany({
        where: { shared_with_user_id: userId, user_lists: { share_mode: 'ouvert' } },
        include: {
          user_lists: {
            include: {
              users: { select: USER_PUBLIC_SELECT },
              _count: { select: { list_items: true } },
            },
          },
        },
        orderBy: { shared_at: 'desc' },
      }),
    );

    const lists = [
      ...ownLists.map((list) => ({ ...list, shared: false })),
      ...editableShares.map(({ user_lists: { users, ...list } }) => ({
        ...list,
        items: [],
        shared: true,
        owner: users,
      })),
    ];

    // Vérifier quels items existent pour ce titre
    const existingItems = await this.prisma.forUser(userId, (tx) =>
      tx.list_items.findMany({
        where: {
          list_id: { in: lists.map((l) => l.id) },
          title_id: titleId,
        },
        select: { list_id: true },
      }),
    );

    const listIdsWithTitle = new Set(existingItems.map((i) => i.list_id));

    return lists.map((list) => ({
      ...list,
      contains_title: listIdsWithTitle.has(list.id),
    }));
  }

  /**
   * GET /lists/:id
   * Détail d'une liste avec ses items (titles).
   * Accessible au propriétaire et aux utilisateurs avec qui la liste est partagée.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté
   * @returns La liste avec ses items
   */
  async getListDetail(listId: string, userId: string) {
    const list = await this.assertCan(listId, userId, 'read');

    const owner = await this.prisma.users.findUnique({
      where: { id: list.user_id },
      select: USER_PUBLIC_SELECT,
    });

    const items = await this.prisma.forUser(userId, (tx) =>
      tx.list_items.findMany({
        where: { list_id: listId },
        orderBy: { position: 'asc' },
        include: {
          titles: {
            select: {
              id: true,
              tmdb_id: true,
              titre_vo: true,
              titre_vf: true,
              affiche_url: true,
              type: true,
              date_sortie: true,
              note_imdb: true,
              duree_minutes: true,
              // Nombre total d'épisodes (hors saison 0/spéciaux) affiché sur les
              // cards série de la watchlist — sommé depuis le compte par saison.
              seasons: {
                where: { numero: { not: 0 } },
                select: { _count: { select: { episodes: true } } },
              },
              title_genres: { include: { genres: { select: { id: true, nom: true } } } },
              title_countries: { include: { countries: { select: { id: true, nom: true } } } },
            },
          },
        },
      }),
    );

    return {
      id: list.id,
      nom: list.nom,
      type: list.type,
      description: list.description,
      created_at: list.created_at,
      share_mode: list.share_mode,
      role: list.role,
      owner,
      capabilities: listCapabilities(list.role, list.share_mode),
      // Items au format frontend `Title` (camelCase, prêts pour TitleCard et le
      // filtrage par type/genre/pays/année/note) plutôt que la forme brute
      // Prisma — le typage frontend `ListDetail.items: Title[]` ne correspondait
      // jamais à la réponse réelle jusqu'ici.
      items: items.map((item) => ({
        id: item.titles.id,
        tmdbId: item.titles.tmdb_id ?? undefined,
        titre: item.titles.titre_vo,
        titreOriginal:
          item.titles.titre_vf && item.titles.titre_vf !== item.titles.titre_vo
            ? item.titles.titre_vf
            : undefined,
        type: item.titles.type,
        dateSortie: item.titles.date_sortie
          ? item.titles.date_sortie.toISOString()
          : undefined,
        note: item.titles.note_imdb ? Number(item.titles.note_imdb) : undefined,
        duree: item.titles.duree_minutes ?? undefined,
        nombreEpisodes:
          item.titles.type === 'serie'
            ? item.titles.seasons.reduce((sum, s) => sum + s._count.episodes, 0)
            : undefined,
        afficheUrl: item.titles.affiche_url ?? undefined,
        genres: item.titles.title_genres.map((tg) => tg.genres),
        pays: item.titles.title_countries.map((tc) => tc.countries),
        addedAt: item.added_at,
        position: item.position,
        statut: (item as any).statut,
      })),
    };
  }

  /**
   * PATCH /lists/:id
   * Modifie le nom et/ou la description d'une liste.
   * Créateur, ou membre si le mode est 'collaboratif' ou 'ouvert'.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté
   * @param dto - Données de modification
   * @returns La liste modifiée
   */
  async updateList(listId: string, userId: string, dto: UpdateListDto) {
    await this.assertCan(listId, userId, 'list:update');

    const data: any = {};
    if (dto.nom !== undefined) data.nom = dto.nom;
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.forUser(userId, (tx) => tx.user_lists.update({ where: { id: listId }, data }));
  }

  /**
   * DELETE /lists/:id
   * Supprime une liste (cascade sur list_items et list_shares).
   * Seul le propriétaire peut supprimer.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté
   */
  async deleteList(listId: string, userId: string): Promise<void> {
    await this.assertCan(listId, userId, 'list:delete');

    await this.prisma.forUser(userId, (tx) => tx.user_lists.delete({ where: { id: listId } }));
  }

  // ======================================================================
  // LIST_ITEMS
  // ======================================================================

  /**
   * POST /lists/:listId/items
   * Ajoute un titre à une liste.
   * La position est auto-incrémentée (max(position) + 1).
   * Créateur, ou membre si le mode est 'ouvert'.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté
   * @param titleId - UUID du titre à ajouter
   * @returns L'item créé
   */
  async addItem(listId: string, userId: string, titleId: string) {
    await this.assertCan(listId, userId, 'item:add');

    // Vérifier que le titre existe
    const title = await this.prisma.titles.findUnique({
      where: { id: titleId },
      select: { id: true },
    });

    if (!title) {
      throw new NotFoundException('Titre introuvable.');
    }

    const titlesSelect = {
      id: true,
      tmdb_id: true,
      titre_vo: true,
      titre_vf: true,
      affiche_url: true,
      type: true,
    } as const;

    return this.prisma.forUser(userId, async (tx) => {
      // Vérifier si le titre est déjà dans la liste (évite les doublons)
      const existingItem = await tx.list_items.findUnique({
        where: {
          list_id_title_id: { list_id: listId, title_id: titleId },
        },
      });

      if (existingItem) {
        // Déjà présent, retourner l'existant avec les infos du titre
        return tx.list_items.findUnique({
          where: {
            list_id_title_id: { list_id: listId, title_id: titleId },
          },
          include: { titles: { select: titlesSelect } },
        });
      }

      // Trouver la position max actuelle
      const lastItem = await tx.list_items.findFirst({
        where: { list_id: listId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const nextPosition = (lastItem?.position ?? -1) + 1;

      return tx.list_items.create({
        data: {
          list_id: listId,
          title_id: titleId,
          position: nextPosition,
        },
        include: { titles: { select: titlesSelect } },
      });
    });
  }

  /**
   * DELETE /lists/:listId/items/:titleId
   * Retire un titre d'une liste.
   * Créateur, ou membre si le mode est 'ouvert'.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté
   * @param titleId - UUID du titre à retirer
   */
  async removeItem(listId: string, userId: string, titleId: string): Promise<void> {
    await this.assertCan(listId, userId, 'item:remove');

    await this.prisma.forUser(userId, async (tx) => {
      // Vérifier que l'item existe dans la liste
      const item = await tx.list_items.findUnique({
        where: {
          list_id_title_id: { list_id: listId, title_id: titleId },
        },
      });

      if (!item) {
        throw new NotFoundException('Cet item ne fait pas partie de la liste.');
      }

      await tx.list_items.delete({
        where: {
          list_id_title_id: { list_id: listId, title_id: titleId },
        },
      });
    });
  }

  /**
   * PATCH /lists/:listId/items/:titleId/statut
   * Met à jour le statut de progression d'un item de la watchlist
   * ("en_cours" / "a_jour" / "abandonnee").
   * Créateur, ou membre si le mode est 'collaboratif' ou 'ouvert'.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté
   * @param titleId - UUID du titre
   * @param dto - Nouveau statut
   */
  async updateItemStatus(listId: string, userId: string, titleId: string, dto: UpdateItemStatusDto) {
    await this.assertCan(listId, userId, 'item:update');

    return this.prisma.forUser(userId, async (tx) => {
      // Vérifier que l'item existe dans la liste
      const item = await tx.list_items.findUnique({
        where: {
          list_id_title_id: { list_id: listId, title_id: titleId },
        },
      });

      if (!item) {
        throw new NotFoundException('Cet item ne fait pas partie de la liste.');
      }

      return tx.list_items.update({
        where: {
          list_id_title_id: { list_id: listId, title_id: titleId },
        },
        data: { statut: dto.statut } as any,
      });
    });
  }

  /**
   * PATCH /lists/:listId/items/reorder
   * Réordonnancement batch des items d'une liste.
   * Créateur, ou membre si le mode est 'collaboratif' ou 'ouvert'.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté
   * @param dto - Données de réordonnancement
   */
  async reorderItems(listId: string, userId: string, dto: ReorderDto): Promise<void> {
    await this.assertCan(listId, userId, 'item:update');

    await this.prisma.forUser(userId, async (tx) => {
      // Vérifier que tous les title_id appartiennent bien à la liste
      const existingItems = await tx.list_items.findMany({
        where: { list_id: listId },
        select: { title_id: true },
      });

      const existingTitleIds = new Set(existingItems.map((i) => i.title_id));
      const dtoTitleIds = dto.items.map((i) => i.title_id);

      for (const tid of dtoTitleIds) {
        if (!existingTitleIds.has(tid)) {
          throw new NotFoundException(`Le titre ${tid} ne fait pas partie de la liste.`);
        }
      }

      // Mettre à jour les positions (même transaction : app.user_id ne
      // survivrait pas à un $transaction([...]) séparé, cf. forUser()).
      for (const item of dto.items) {
        await tx.list_items.update({
          where: {
            list_id_title_id: { list_id: listId, title_id: item.title_id },
          },
          data: { position: item.position },
        });
      }
    });
  }

  // ======================================================================
  // LIST_SHARES
  // ======================================================================

  /**
   * PATCH /lists/:listId/share-mode
   * Change le mode de partage de la liste (s'applique à tous ses membres).
   * Créateur uniquement.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté (créateur)
   * @param dto - Nouveau mode
   * @returns La liste modifiée
   */
  async updateShareMode(listId: string, userId: string, dto: UpdateShareModeDto) {
    const list = await this.assertCan(listId, userId, 'shares:manage');
    this.assertShareable(list.type);

    return this.prisma.forUser(userId, (tx) =>
      tx.user_lists.update({ where: { id: listId }, data: { share_mode: dto.share_mode } }),
    );
  }

  /**
   * POST /lists/:listId/shares
   * Ajoute un membre à une liste. Créateur uniquement.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté (créateur)
   * @param dto - Utilisateur à ajouter
   * @returns Le partage créé
   * @throws BadRequestException liste personnelle (watchlist/favoris) ou partage avec soi-même
   * @throws ConflictException si l'utilisateur est déjà membre
   */
  async shareList(listId: string, userId: string, dto: ShareListDto) {
    const list = await this.assertCan(listId, userId, 'shares:manage');
    this.assertShareable(list.type);

    if (dto.shared_with_user_id === userId) {
      throw new BadRequestException('Vous ne pouvez pas partager une liste avec vous-même.');
    }

    const targetUser = await this.prisma.users.findUnique({
      where: { id: dto.shared_with_user_id },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Utilisateur destinataire introuvable.');
    }

    return this.prisma.forUser(userId, async (tx) => {
      const existing = await tx.list_shares.findUnique({
        where: {
          list_id_shared_with_user_id: {
            list_id: listId,
            shared_with_user_id: dto.shared_with_user_id,
          },
        },
        select: { list_id: true },
      });

      if (existing) {
        throw new ConflictException('Cette liste est déjà partagée avec cet utilisateur.');
      }

      return tx.list_shares.create({
        data: { list_id: listId, shared_with_user_id: dto.shared_with_user_id },
        include: { users: { select: USER_PUBLIC_SELECT } },
      });
    });
  }

  /**
   * GET /lists/:listId/shares
   * Membres d'une liste. Créateur uniquement.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté
   * @returns Tableau des partages
   */
  async getShares(listId: string, userId: string) {
    await this.assertCan(listId, userId, 'shares:manage');

    return this.prisma.forUser(userId, (tx) =>
      tx.list_shares.findMany({
        where: { list_id: listId },
        include: { users: { select: USER_PUBLIC_SELECT } },
        orderBy: { shared_at: 'desc' },
      }),
    );
  }

  /**
   * DELETE /lists/:listId/shares/:sharedWithUserId
   * Retire un membre d'une liste. Créateur uniquement.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID de l'utilisateur connecté (créateur)
   * @param sharedWithUserId - UUID du membre à retirer
   */
  async removeShare(listId: string, userId: string, sharedWithUserId: string): Promise<void> {
    await this.assertCan(listId, userId, 'shares:manage');
    await this.deleteShareOrThrow(listId, userId, sharedWithUserId);
  }

  /**
   * DELETE /shared-lists/:listId
   * Un membre quitte une liste partagée avec lui.
   *
   * @param listId - UUID de la liste
   * @param userId - UUID du membre connecté
   * @throws NotFoundException si l'utilisateur n'est pas membre de la liste
   */
  async leaveSharedList(listId: string, userId: string): Promise<void> {
    await this.deleteShareOrThrow(listId, userId, userId);
  }

  /**
   * GET /shared-lists
   * Listes partagées avec l'utilisateur connecté, avec le mode de partage et
   * les droits qui en découlent pour lui.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @returns Tableau des listes partagées
   */
  async getSharedLists(userId: string) {
    const shares = await this.prisma.forUser(userId, (tx) =>
      tx.list_shares.findMany({
        where: { shared_with_user_id: userId },
        include: {
          user_lists: {
            include: {
              users: { select: USER_PUBLIC_SELECT },
              _count: { select: { list_items: true } },
            },
          },
        },
        orderBy: { shared_at: 'desc' },
      }),
    );

    return shares.map((share) => {
      const shareMode = share.user_lists.share_mode as ShareMode;
      return {
        list_id: share.list_id,
        shared_at: share.shared_at,
        share_mode: shareMode,
        capabilities: listCapabilities('member', shareMode),
        list: {
          id: share.user_lists.id,
          nom: share.user_lists.nom,
          type: share.user_lists.type,
          description: share.user_lists.description,
          created_at: share.user_lists.created_at,
          item_count: share.user_lists._count.list_items,
          owner: share.user_lists.users,
        },
      };
    });
  }

  /** Les listes personnelles (watchlist, favoris) ne se partagent pas. */
  private assertShareable(listType: string): void {
    if ((NON_SHAREABLE_LIST_TYPES as readonly string[]).includes(listType)) {
      throw new BadRequestException('Les listes watchlist et favoris ne peuvent pas être partagées.');
    }
  }

  /**
   * Supprime l'appartenance de `sharedWithUserId` à la liste. La RLS autorise
   * le créateur (retirer un membre) et le membre lui-même (quitter la liste).
   */
  private async deleteShareOrThrow(
    listId: string,
    userId: string,
    sharedWithUserId: string,
  ): Promise<void> {
    await this.prisma.forUser(userId, async (tx) => {
      const where = {
        list_id_shared_with_user_id: { list_id: listId, shared_with_user_id: sharedWithUserId },
      };

      const share = await tx.list_shares.findUnique({ where, select: { list_id: true } });
      if (!share) {
        throw new NotFoundException('Partage introuvable.');
      }

      await tx.list_shares.delete({ where });
    });
  }
}
