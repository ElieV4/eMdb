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
import { SetItemVuDto } from './dto/set-item-vu.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { SetItemGroupsDto } from './dto/set-item-groups.dto';
import { CommentDto } from './dto/comment.dto';
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
          vu_by_user: { select: { pseudo: true } },
          list_item_groups: { select: { group_id: true } },
          _count: { select: { list_item_comments: true } },
        },
      }),
    );

    const titleIds = items.map((item) => item.title_id);
    const { mine, others } = await this.getPersonalComments(list, userId, titleIds);

    const [groups, memberCount] = await this.prisma.forUser(userId, (tx) =>
      Promise.all([
        tx.list_groups.findMany({
          where: { list_id: listId },
          select: { id: true, parent_id: true, nom: true, position: true },
          orderBy: [{ position: 'asc' }, { created_at: 'asc' }],
        }),
        tx.list_shares.count({ where: { list_id: listId } }),
      ]),
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
      // Nombre de membres : le front n'affiche le suivi "vu" de la liste que
      // pour une liste réellement partagée. Le créateur voit tous les
      // membres (RLS list_shares) ; un membre ne voit que lui-même, d'où le
      // minimum de 1 côté membre.
      member_count: list.role === 'member' ? Math.max(memberCount, 1) : memberCount,
      // Sous-groupes à plat (parent_id) : le front reconstruit l'arbre.
      groups,
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
        vu: item.vu_at !== null,
        vuAt: item.vu_at ?? undefined,
        vuBy: item.vu_by_user?.pseudo ?? undefined,
        groupIds: item.list_item_groups.map((g) => g.group_id),
        // Commentaire perso de l'utilisateur connecté (user_ratings).
        myComment: mine.get(item.title_id) ?? undefined,
        // Commentaires perso des autres membres qui ont choisi de les partager.
        memberComments: others.get(item.title_id) ?? [],
        // Nombre de commentaires du fil partagé de la liste.
        commentCount: item._count.list_item_comments,
      })),
    };
  }

  /**
   * Commentaires perso (user_ratings.commentaire) des titres d'une liste :
   * - `mine` : ceux de l'utilisateur connecté ;
   * - `others` : ceux des autres membres de la liste (créateur compris) qui
   *   ont activé `commentaires_visibles`, seulement si la liste est partagée.
   *
   * La RLS de user_ratings limite chaque utilisateur à ses propres notes :
   * la lecture des autres passe par `asSystem`, strictement bornée aux
   * membres de cette liste (l'accès à la liste a déjà été vérifié par
   * l'appelant) et aux titres qu'elle contient.
   */
  private async getPersonalComments(
    list: { id: string; user_id: string },
    userId: string,
    titleIds: string[],
  ) {
    const mine = new Map<string, string>();
    const others = new Map<string, Array<{ pseudo: string; commentaire: string }>>();
    if (titleIds.length === 0) return { mine, others };

    const own = await this.prisma.forUser(userId, (tx) =>
      tx.user_ratings.findMany({
        where: { user_id: userId, title_id: { in: titleIds }, commentaire: { not: null } },
        select: { title_id: true, commentaire: true },
      }),
    );
    for (const r of own) {
      if (r.title_id && r.commentaire) mine.set(r.title_id, r.commentaire);
    }

    const shared = await this.prisma.asSystem(async (tx) => {
      const shares = await tx.list_shares.findMany({
        where: { list_id: list.id },
        select: { shared_with_user_id: true },
      });
      if (shares.length === 0) return [];

      const memberIds = [list.user_id, ...shares.map((s) => s.shared_with_user_id)].filter(
        (id) => id !== userId,
      );

      return tx.user_ratings.findMany({
        where: {
          user_id: { in: memberIds },
          title_id: { in: titleIds },
          commentaire: { not: null },
          users: { commentaires_visibles: true },
        },
        select: { title_id: true, commentaire: true, users: { select: { pseudo: true } } },
        orderBy: { updated_at: 'desc' },
      });
    });
    for (const r of shared) {
      if (!r.title_id || !r.commentaire) continue;
      others.set(r.title_id, [
        ...(others.get(r.title_id) ?? []),
        { pseudo: r.users.pseudo, commentaire: r.commentaire },
      ]);
    }

    return { mine, others };
  }

  // ======================================================================
  // COMMENTAIRES PARTAGÉS (fil par titre)
  // ======================================================================

  private static readonly COMMENT_SELECT = {
    id: true,
    contenu: true,
    created_at: true,
    updated_at: true,
    user_id: true,
    users: { select: { pseudo: true, avatar_url: true } },
  } as const;

  private formatComment(
    c: {
      id: string;
      contenu: string;
      created_at: Date;
      updated_at: Date;
      user_id: string;
      users: { pseudo: string; avatar_url: string | null };
    },
    userId: string,
    canModerate: boolean,
    canWrite: boolean,
  ) {
    const isAuthor = c.user_id === userId;
    return {
      id: c.id,
      contenu: c.contenu,
      created_at: c.created_at,
      updated_at: c.updated_at,
      author: { id: c.user_id, pseudo: c.users.pseudo, avatar_url: c.users.avatar_url },
      canEdit: isAuthor && canWrite,
      canDelete: (isAuthor && canWrite) || canModerate,
    };
  }

  /**
   * GET /lists/:listId/items/:titleId/comments
   * Fil des commentaires partagés d'un titre de la liste, du plus ancien au
   * plus récent. Lisible par tout membre.
   */
  async getItemComments(listId: string, userId: string, titleId: string) {
    const list = await this.assertCan(listId, userId, 'read');
    const canWrite = canOnList(list.role, list.share_mode, 'item:update');
    const canModerate = canOnList(list.role, list.share_mode, 'shares:manage');

    const comments = await this.prisma.forUser(userId, (tx) =>
      tx.list_item_comments.findMany({
        where: { list_id: listId, title_id: titleId },
        select: ListsService.COMMENT_SELECT,
        orderBy: { created_at: 'asc' },
      }),
    );

    return {
      canWrite,
      comments: comments.map((c) => this.formatComment(c, userId, canModerate, canWrite)),
    };
  }

  /**
   * POST /lists/:listId/items/:titleId/comments
   * Ajoute un commentaire au fil. Créateur, ou membre en collaboratif / ouvert.
   */
  async addItemComment(listId: string, userId: string, titleId: string, dto: CommentDto) {
    const list = await this.assertCan(listId, userId, 'item:update');

    return this.prisma.forUser(userId, async (tx) => {
      const item = await tx.list_items.findUnique({
        where: { list_id_title_id: { list_id: listId, title_id: titleId } },
        select: { list_id: true },
      });
      if (!item) {
        throw new NotFoundException('Cet item ne fait pas partie de la liste.');
      }

      const comment = await tx.list_item_comments.create({
        data: { list_id: listId, title_id: titleId, user_id: userId, contenu: dto.contenu.trim() },
        select: ListsService.COMMENT_SELECT,
      });
      return this.formatComment(comment, userId, list.role === 'owner', true);
    });
  }

  /**
   * PATCH /lists/:listId/comments/:commentId
   * Modifie un de ses commentaires (auteur, avec le droit d'écrire).
   */
  async updateItemComment(listId: string, userId: string, commentId: string, dto: CommentDto) {
    const list = await this.assertCan(listId, userId, 'item:update');

    return this.prisma.forUser(userId, async (tx) => {
      const comment = await this.findCommentOrThrow(tx, listId, commentId);
      if (comment.user_id !== userId) {
        throw new ForbiddenException('Vous ne pouvez modifier que vos propres commentaires.');
      }

      const updated = await tx.list_item_comments.update({
        where: { id: commentId },
        data: { contenu: dto.contenu.trim() },
        select: ListsService.COMMENT_SELECT,
      });
      return this.formatComment(updated, userId, list.role === 'owner', true);
    });
  }

  /**
   * DELETE /lists/:listId/comments/:commentId
   * Supprime un commentaire : son auteur (avec le droit d'écrire), ou le
   * créateur de la liste (modération).
   */
  async deleteItemComment(listId: string, userId: string, commentId: string): Promise<void> {
    const list = await this.assertCan(listId, userId, 'read');
    const canWrite = canOnList(list.role, list.share_mode, 'item:update');
    const canModerate = canOnList(list.role, list.share_mode, 'shares:manage');

    await this.prisma.forUser(userId, async (tx) => {
      const comment = await this.findCommentOrThrow(tx, listId, commentId);
      const isAuthor = comment.user_id === userId;
      if (!canModerate && !(isAuthor && canWrite)) {
        throw new ForbiddenException('Vous ne pouvez pas supprimer ce commentaire.');
      }
      await tx.list_item_comments.delete({ where: { id: commentId } });
    });
  }

  private async findCommentOrThrow(tx: any, listId: string, commentId: string) {
    const comment = await tx.list_item_comments.findFirst({
      where: { id: commentId, list_id: listId },
      select: { id: true, user_id: true },
    });
    if (!comment) {
      throw new NotFoundException('Commentaire introuvable.');
    }
    return comment;
  }

  // ======================================================================
  // VU DANS LA LISTE
  // ======================================================================

  /**
   * PATCH /lists/:listId/items/:titleId/vu
   * Marque un titre comme vu (ou non) dans le cadre de la liste : un seul
   * état, partagé par tous les membres. Créateur, ou membre en mode
   * 'collaboratif' / 'ouvert' (même droit que réordonner ou changer un statut).
   */
  async setItemVu(listId: string, userId: string, titleId: string, dto: SetItemVuDto) {
    await this.assertCan(listId, userId, 'item:update');

    return this.prisma.forUser(userId, async (tx) => {
      const where = { list_id_title_id: { list_id: listId, title_id: titleId } };
      const item = await tx.list_items.findUnique({ where, select: { list_id: true } });
      if (!item) {
        throw new NotFoundException('Cet item ne fait pas partie de la liste.');
      }

      const updated = await tx.list_items.update({
        where,
        data: dto.vu ? { vu_at: new Date(), vu_by: userId } : { vu_at: null, vu_by: null },
        select: { title_id: true, vu_at: true, vu_by_user: { select: { pseudo: true } } },
      });

      return {
        titleId: updated.title_id,
        vu: updated.vu_at !== null,
        vuAt: updated.vu_at ?? undefined,
        vuBy: updated.vu_by_user?.pseudo ?? undefined,
      };
    });
  }

  // ======================================================================
  // SOUS-GROUPES
  // ======================================================================

  /**
   * POST /lists/:listId/groups
   * Crée un sous-groupe, à la racine ou sous `parent_id` (qui doit appartenir
   * à la même liste). Créateur, ou membre en mode 'ouvert'.
   */
  async createGroup(listId: string, userId: string, dto: CreateGroupDto) {
    await this.assertCan(listId, userId, 'item:add');

    return this.prisma.forUser(userId, async (tx) => {
      if (dto.parent_id) {
        const parent = await tx.list_groups.findFirst({
          where: { id: dto.parent_id, list_id: listId },
          select: { id: true },
        });
        if (!parent) {
          throw new NotFoundException('Sous-groupe parent introuvable dans cette liste.');
        }
      }

      const last = await tx.list_groups.findFirst({
        where: { list_id: listId, parent_id: dto.parent_id ?? null },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      return tx.list_groups.create({
        data: {
          list_id: listId,
          parent_id: dto.parent_id ?? null,
          nom: dto.nom.trim(),
          position: (last?.position ?? -1) + 1,
        },
        select: { id: true, parent_id: true, nom: true, position: true },
      });
    });
  }

  /**
   * PATCH /lists/:listId/groups/:groupId
   * Renomme un sous-groupe. Créateur, ou membre en 'collaboratif' / 'ouvert'.
   */
  async renameGroup(listId: string, userId: string, groupId: string, dto: UpdateGroupDto) {
    await this.assertCan(listId, userId, 'item:update');

    return this.prisma.forUser(userId, async (tx) => {
      await this.findGroupOrThrow(tx, listId, groupId);
      return tx.list_groups.update({
        where: { id: groupId },
        data: { nom: dto.nom.trim() },
        select: { id: true, parent_id: true, nom: true, position: true },
      });
    });
  }

  /**
   * DELETE /lists/:listId/groups/:groupId
   * Supprime un sous-groupe et ses sous-groupes (cascade). Les titres restent
   * dans la liste. Créateur, ou membre en mode 'ouvert'.
   */
  async deleteGroup(listId: string, userId: string, groupId: string): Promise<void> {
    await this.assertCan(listId, userId, 'item:remove');

    await this.prisma.forUser(userId, async (tx) => {
      await this.findGroupOrThrow(tx, listId, groupId);
      await tx.list_groups.delete({ where: { id: groupId } });
    });
  }

  /**
   * PUT /lists/:listId/items/:titleId/groups
   * Remplace les sous-groupes dans lesquels un titre est rangé. Créateur, ou
   * membre en 'collaboratif' / 'ouvert'.
   */
  async setItemGroups(listId: string, userId: string, titleId: string, dto: SetItemGroupsDto) {
    await this.assertCan(listId, userId, 'item:update');
    const groupIds = [...new Set(dto.group_ids)];

    return this.prisma.forUser(userId, async (tx) => {
      const item = await tx.list_items.findUnique({
        where: { list_id_title_id: { list_id: listId, title_id: titleId } },
        select: { list_id: true },
      });
      if (!item) {
        throw new NotFoundException('Cet item ne fait pas partie de la liste.');
      }

      if (groupIds.length > 0) {
        const found = await tx.list_groups.count({
          where: { id: { in: groupIds }, list_id: listId },
        });
        if (found !== groupIds.length) {
          throw new NotFoundException('Sous-groupe introuvable dans cette liste.');
        }
      }

      await tx.list_item_groups.deleteMany({ where: { list_id: listId, title_id: titleId } });
      if (groupIds.length > 0) {
        await tx.list_item_groups.createMany({
          data: groupIds.map((groupId) => ({ list_id: listId, title_id: titleId, group_id: groupId })),
        });
      }

      return { titleId, groupIds };
    });
  }

  private async findGroupOrThrow(tx: any, listId: string, groupId: string) {
    const group = await tx.list_groups.findFirst({
      where: { id: groupId, list_id: listId },
      select: { id: true },
    });
    if (!group) {
      throw new NotFoundException('Sous-groupe introuvable dans cette liste.');
    }
    return group;
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
