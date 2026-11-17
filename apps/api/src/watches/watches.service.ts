import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';
import { CreateWatchDto } from './dto/create-watch.dto';
import { ListWatchesFilterDto } from './dto/list-watches-filter.dto';
import { UpdateWatchContextDto } from './dto/update-watch-context.dto';
import { getSerieProgress } from '@emdb/db';

/**
 * Service métier pour le module watches (Phase 4.1).
 *
 * Gère :
 * - Les visionnages (user_watches) : créer, supprimer, lister
 * - Le suivi de séries (user_follows_serie) : suivre, ne plus suivre, lister
 * - La progression (fn_progress_serie, fn_episodes_non_vus)
 * - Le calendrier des épisodes non vus
 */
@Injectable()
export class WatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listsService: ListsService,
  ) {}

  /**
   * Ajoute automatiquement une série à la watchlist dès qu'un de ses
   * épisodes est marqué vu (retour utilisateur) — n'écrase jamais un statut
   * de progression déjà présent (ex. "abandonnée"), ajoute seulement si la
   * série n'y est pas encore. Non bloquant : une erreur ici ne doit pas
   * faire échouer le "marquer comme vu" lui-même.
   */
  private async addSerieToWatchlist(userId: string, titleId: string): Promise<void> {
    try {
      const watchlist = await this.listsService.createList(userId, {
        nom: 'Ma Watchlist',
        type: 'watchlist',
      });
      await this.listsService.addItem(watchlist.id, userId, titleId);
    } catch {
      // non bloquant — le visionnage reste enregistré même si l'ajout échoue
    }
  }

  // ======================================================================
  // WATCHES
  // ======================================================================

  /**
   * Marque un titre ou un épisode comme vu.
   *
   * Validation :
   * - Soit title_id, soit episode_id doit être fourni (pas les deux, pas aucun)
   * - Si episode_id fourni, l'épisode doit exister
   * - Si title_id fourni (et pas episode_id), le titre doit exister
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param dto - Données du watch
   * @returns Le watch créé
   */
  async createWatch(userId: string, dto: CreateWatchDto) {
    const { title_id, episode_id, date_vue } = dto;

    // Validation : soit title_id, soit episode_id, pas les deux, pas aucun
    if (!title_id && !episode_id) {
      throw new BadRequestException("Vous devez fournir 'title_id' ou 'episode_id'.");
    }

    if (title_id && episode_id) {
      throw new BadRequestException(
        "Vous ne pouvez pas fournir 'title_id' et 'episode_id' en même temps.",
      );
    }

    // Vérifier que le titre ou l'épisode existe
    let title: { id: string; type: string } | null = null;
    if (title_id) {
      title = await this.prisma.titles.findUnique({
        where: { id: title_id },
        select: { id: true, type: true },
      });
      if (!title) {
        throw new NotFoundException('Titre introuvable.');
      }
    }

    let episodeSerieId: string | null = null;
    if (episode_id) {
      const episode = await this.prisma.episodes.findUnique({
        where: { id: episode_id },
        select: { id: true, seasons: { select: { title_id: true } } },
      });
      if (!episode) {
        throw new NotFoundException('Épisode introuvable.');
      }
      episodeSerieId = episode.seasons.title_id;
    }

    const watch = await this.prisma.forUser(userId, async (tx) => {
      const watch = await tx.user_watches.create({
        data: {
          user_id: userId,
          title_id: title_id ?? null,
          episode_id: episode_id ?? null,
          date_vue: date_vue ?? new Date(),
        },
        include: {
          titles: {
            select: {
              id: true,
              tmdb_id: true,
              titre_vo: true,
              titre_vf: true,
              affiche_url: true,
              type: true,
            },
          },
          episodes: {
            select: {
              id: true,
              numero: true,
              titre: true,
              seasons: { select: { numero: true } },
            },
          },
        },
      });

      // Un film marqué vu sort automatiquement de la watchlist (retour
      // utilisateur) — n'a de sens que pour un film (visionnage complet en un
      // seul événement) : une série marquée "vue" épisode par épisode n'a pas
      // ce même moment "terminé" univoque, donc la watchlist série n'est
      // jamais retirée automatiquement.
      if (title && title.type === 'film') {
        await tx.list_items.deleteMany({
          where: {
            title_id: title.id,
            user_lists: { user_id: userId, type: 'watchlist' },
          },
        });
      }

      return watch;
    });

    // Voir un épisode d'une série l'ajoute automatiquement à la watchlist
    // (retour utilisateur).
    if (episodeSerieId) {
      await this.addSerieToWatchlist(userId, episodeSerieId);
    }

    return watch;
  }

  /**
   * Supprime un watch (visionnage).
   *
   * @param id - UUID du watch
   * @param userId - UUID de l'utilisateur connecté (vérification d'appartenance)
   */
  async deleteWatch(id: string, userId: string): Promise<void> {
    await this.prisma.forUser(userId, async (tx) => {
      const watch = await tx.user_watches.findUnique({
        where: { id },
        select: { id: true, user_id: true },
      });

      if (!watch) {
        throw new NotFoundException('Visionnage introuvable.');
      }

      if (watch.user_id !== userId) {
        throw new ForbiddenException('Ce visionnage ne vous appartient pas.');
      }

      await tx.user_watches.delete({ where: { id } });
    });
  }

  /**
   * Modifie le contexte de visionnage (support, compagnie, émotion) d'un
   * watch existant — saisi uniquement a posteriori, jamais à la création
   * (cf. createWatch). Chaque champ omis reste inchangé ; envoyé à `null`,
   * il est effacé.
   *
   * @param id - UUID du watch
   * @param userId - UUID de l'utilisateur connecté (vérification d'appartenance)
   * @param dto - Champs de contexte à mettre à jour
   */
  async updateWatchContext(id: string, userId: string, dto: UpdateWatchContextDto) {
    return this.prisma.forUser(userId, async (tx) => {
      const watch = await tx.user_watches.findUnique({
        where: { id },
        select: { id: true, user_id: true },
      });

      if (!watch) {
        throw new NotFoundException('Visionnage introuvable.');
      }

      if (watch.user_id !== userId) {
        throw new ForbiddenException('Ce visionnage ne vous appartient pas.');
      }

      let dateVue: Date | undefined;
      if (dto.date_vue !== undefined) {
        dateVue = new Date(dto.date_vue);
        // Une minute de marge pour les horloges légèrement décalées.
        if (dateVue.getTime() > Date.now() + 60_000) {
          throw new BadRequestException('La date de visionnage ne peut pas être dans le futur.');
        }
      }

      return tx.user_watches.update({
        where: { id },
        data: {
          ...(dto.support !== undefined && { support: dto.support }),
          ...(dto.compagnie !== undefined && { compagnie: dto.compagnie }),
          ...(dto.emotion !== undefined && { emotion: dto.emotion }),
          ...(dateVue && { date_vue: dateVue }),
        },
      });
    });
  }

  /**
   * Supprime tous les visionnages d'un titre pour un utilisateur.
   *
   * @param titleId - UUID du titre
   * @param userId - UUID de l'utilisateur connecté
   */
  async deleteAllWatchesByTitle(titleId: string, userId: string): Promise<void> {
    await this.prisma.forUser(userId, (tx) =>
      tx.user_watches.deleteMany({ where: { title_id: titleId, user_id: userId } }),
    );
  }

  /**
   * Supprime tous les visionnages d'un épisode pour un utilisateur
   * ("Annuler le visionnage" sur un épisode, modification M — jusqu'ici
   * aucun endpoint équivalent à `deleteAllWatchesByTitle` n'existait pour
   * les épisodes, ce qui rendait cette action silencieusement inopérante
   * sur la page épisode).
   *
   * @param episodeId - UUID de l'épisode
   * @param userId - UUID de l'utilisateur connecté
   */
  async deleteAllWatchesByEpisode(episodeId: string, userId: string): Promise<void> {
    await this.prisma.forUser(userId, (tx) =>
      tx.user_watches.deleteMany({ where: { episode_id: episodeId, user_id: userId } }),
    );
  }

  /**
   * Marque tous les épisodes d'une série comme vus jusqu'à un épisode donné
   * ("Vu jusqu'ici", modification M).
   *
   * Trouve tous les épisodes du titre dont le numéro de saison est inférieur
   * à celui de l'épisode cible, ou dans la même saison mais avec un numéro
   * d'épisode inférieur ou égal. Crée un visionnage pour chacun.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param episodeId - UUID de l'épisode jusqu'auquel marquer comme vu
   * @param dateVue - Date du visionnage (optionnelle, défaut: maintenant)
   * @returns Nombre de visionnages créés
   */
  async createWatchesUntilEpisode(
    userId: string,
    episodeId: string,
    dateVue?: string,
  ): Promise<number> {
    // Vérifier que l'épisode existe et récupérer sa saison/numéro/titre
    const targetEpisode = await this.prisma.episodes.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        numero: true,
        seasons: { select: { numero: true, title_id: true } },
      },
    });

    if (!targetEpisode) {
      throw new NotFoundException('Épisode introuvable.');
    }

    const titleId = targetEpisode.seasons.title_id;
    const targetSeason = targetEpisode.seasons.numero;
    const targetEpisodeNum = targetEpisode.numero;
    const dateVueValue = dateVue ? new Date(dateVue) : new Date();

    // Trouver tous les épisodes à marquer comme vus
    // (saison < targetSeason) OU (saison == targetSeason ET episode <= targetEpisodeNum)
    const episodesToMark = await this.prisma.episodes.findMany({
      where: {
        seasons: {
          title_id: titleId,
        },
        OR: [
          { seasons: { numero: { lt: targetSeason } } },
          {
            AND: [
              { seasons: { numero: { equals: targetSeason } } },
              { numero: { lte: targetEpisodeNum } },
            ],
          },
        ],
      },
      select: { id: true },
    });

    if (episodesToMark.length === 0) {
      return 0;
    }

    // Vérifier quels épisodes sont déjà vus pour éviter les doublons
    const newWatches = await this.prisma.forUser(userId, async (tx) => {
      const existingWatches = await tx.user_watches.findMany({
        where: {
          user_id: userId,
          episode_id: { in: episodesToMark.map((e) => e.id) },
        },
        select: { episode_id: true },
      });

      const existingEpisodeIds = new Set(
        existingWatches.map((w) => w.episode_id),
      );

      const newWatches = episodesToMark.filter(
        (e) => !existingEpisodeIds.has(e.id),
      );

      if (newWatches.length === 0) {
        return newWatches;
      }

      // title_id reste null sur les visionnages d'épisode (même invariant que
      // createWatch : jamais les deux à la fois, cf. bug #22/#24 — sinon
      // useWatchedTitles() marquerait toute la série "vue" dès le premier
      // "vu jusqu'ici" au lieu de suivre l'avancement épisode par épisode).
      await tx.user_watches.createMany({
        data: newWatches.map((e) => ({
          user_id: userId,
          title_id: null,
          episode_id: e.id,
          date_vue: dateVueValue,
        })),
      });

      return newWatches;
    });

    if (newWatches.length === 0) {
      return 0;
    }

    // Voir un épisode d'une série l'ajoute automatiquement à la watchlist
    // (retour utilisateur) — même comportement que createWatch.
    await this.addSerieToWatchlist(userId, titleId);

    return newWatches.length;
  }

  /**
   * Liste paginée des visionnages de l'utilisateur.
   *
   * Filtres optionnels : type (film/serie), date_from, date_to, title_id.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param filters - Filtres et pagination
   * @returns Liste paginée des watches
   */
  /**
   * Ensemble complet des title_id vus par l'utilisateur — vus directement
   * (user_watches.title_id) ou via un épisode (episode -> season.title_id).
   * Non paginé (contrairement à /watches) : l'icone "vu" sur les affiches a
   * besoin de la vérité complète, pas seulement des 100 derniers visionnages
   * (bug remonté : icone manquante pour les titres à l'historique volumineux,
   * notamment après un import Trakt).
   */
  async getWatchedTitleIds(userId: string): Promise<string[]> {
    const watches = await this.prisma.forUser(userId, (tx) =>
      tx.user_watches.findMany({
        where: { user_id: userId },
        select: {
          title_id: true,
          episodes: { select: { seasons: { select: { title_id: true } } } },
        },
      }),
    );

    const titleIds = new Set<string>();
    for (const watch of watches) {
      if (watch.title_id) {
        titleIds.add(watch.title_id);
      } else if (watch.episodes) {
        titleIds.add(watch.episodes.seasons.title_id);
      }
    }
    return [...titleIds];
  }

  /**
   * GET /watches/title-emotions
   * Émotions renseignées par l'utilisateur pour chaque titre, tous ses
   * visionnages confondus (ceux d'épisodes comptent pour la série), de la
   * plus fréquente à la moins fréquente. Affichées en bas à gauche des
   * affiches (listes, modules horizontaux).
   */
  async getTitleEmotions(userId: string): Promise<Record<string, string[]>> {
    const watches = await this.prisma.forUser(userId, (tx) =>
      tx.user_watches.findMany({
        where: { user_id: userId, NOT: { emotion: { isEmpty: true } } },
        select: {
          title_id: true,
          emotion: true,
          episodes: { select: { seasons: { select: { title_id: true } } } },
        },
      }),
    );

    const counts = new Map<string, Map<string, number>>();
    for (const watch of watches) {
      const titleId = watch.title_id ?? watch.episodes?.seasons.title_id;
      if (!titleId || !watch.emotion?.length) continue;
      const byEmotion = counts.get(titleId) ?? new Map<string, number>();
      for (const e of watch.emotion) byEmotion.set(e, (byEmotion.get(e) ?? 0) + 1);
      counts.set(titleId, byEmotion);
    }

    return Object.fromEntries(
      [...counts].map(([titleId, byEmotion]) => [
        titleId,
        [...byEmotion].sort((a, b) => b[1] - a[1]).map(([e]) => e),
      ]),
    );
  }

  async listWatches(userId: string, filters: ListWatchesFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };
    // Chaque filtre "OR" (title_id, type) est accumulé dans `AND` plutôt que
    // d'écrire directement `where.OR`, pour rester composable si plusieurs
    // filtres à base de OR sont actifs en même temps (ex. title_id + type).
    const andConditions: any[] = [];

    if (filters.date_from || filters.date_to) {
      where.date_vue = {};
      if (filters.date_from) where.date_vue.gte = filters.date_from;
      if (filters.date_to) where.date_vue.lte = filters.date_to;
    }

    if (filters.title_id) {
      // Un watch porte soit sur un titre directement (title_id), soit sur un
      // épisode de ce titre (episode_id, title_id alors null — cf.
      // createWatch()). Filtrer uniquement sur `title_id` manque donc tous
      // les visionnages d'épisodes d'une série (modification M : l'historique
      // d'une série sur TitleActions n'affichait jamais rien, l'essentiel des
      // visionnages d'une série étant par épisode).
      andConditions.push({
        OR: [
          { title_id: filters.title_id },
          { episodes: { seasons: { title_id: filters.title_id } } },
        ],
      });
    }

    if (filters.episode_id) {
      where.episode_id = filters.episode_id;
    }

    if (filters.type) {
      // Même principe que ci-dessus, appliqué à `titles.type` (bug #44) :
      // il faut aussi suivre episode → season → title pour ne pas ignorer
      // les visionnages d'épisodes lors du filtre par type.
      if (filters.type === 'serie') {
        andConditions.push({
          OR: [
            { titles: { type: 'serie' } },
            { episodes: { seasons: { titles: { type: 'serie' } } } },
          ],
        });
      } else {
        // Un épisode appartient toujours à une série, jamais à un film.
        where.titles = { type: 'film' };
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const { data, total, ratings } = await this.prisma.forUser(userId, async (tx) => {
      const [data, total] = await Promise.all([
        tx.user_watches.findMany({
          where,
          orderBy: { date_vue: 'desc' },
          skip,
          take: limit,
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
              },
            },
            episodes: {
              select: {
                id: true,
                numero: true,
                titre: true,
                duree_minutes: true,
                seasons: {
                  select: {
                    numero: true,
                    titles: {
                      select: {
                        id: true,
                        tmdb_id: true,
                        titre_vo: true,
                        titre_vf: true,
                        affiche_url: true,
                        type: true,
                        date_sortie: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        tx.user_watches.count({ where }),
      ]);

      // Note personnelle par visionnage (affichée en sous-titre à la place de
      // la durée dans l'Historique) — pas de relation directe user_watches ->
      // user_ratings, jointure manuelle limitée aux titres/épisodes de cette
      // page plutôt qu'un lookup par item.
      const titleIds = [...new Set(data.filter((w) => w.title_id).map((w) => w.title_id as string))];
      const episodeIds = [...new Set(data.filter((w) => w.episode_id).map((w) => w.episode_id as string))];
      const ratings =
        titleIds.length > 0 || episodeIds.length > 0
          ? await tx.user_ratings.findMany({
              where: {
                user_id: userId,
                OR: [
                  ...(titleIds.length > 0 ? [{ title_id: { in: titleIds } }] : []),
                  ...(episodeIds.length > 0 ? [{ episode_id: { in: episodeIds } }] : []),
                ],
              },
              select: { title_id: true, episode_id: true, note_perso: true, commentaire: true },
            })
          : [];

      return { data, total, ratings };
    });
    // Une ligne user_ratings peut ne porter qu'un commentaire (note_perso
    // null) : ne pas la convertir en 0, qui s'afficherait comme "★ 0".
    const noteOf = (r: { note_perso: unknown }) => (r.note_perso === null ? null : Number(r.note_perso));
    const ratingByTitleId = new Map(ratings.filter((r) => r.title_id).map((r) => [r.title_id, noteOf(r)]));
    const ratingByEpisodeId = new Map(
      ratings.filter((r) => r.episode_id).map((r) => [r.episode_id, noteOf(r)]),
    );

    // Commentaire perso du titre (ou de l'épisode), affiché sous chaque
    // visionnage dans l'Historique.
    const commentByTitleId = new Map(
      ratings.filter((r) => r.title_id && r.commentaire).map((r) => [r.title_id, r.commentaire]),
    );
    const commentByEpisodeId = new Map(
      ratings.filter((r) => r.episode_id && r.commentaire).map((r) => [r.episode_id, r.commentaire]),
    );

    const items = data.map((watch) => ({
      ...watch,
      note_perso: watch.episode_id
        ? (ratingByEpisodeId.get(watch.episode_id) ?? null)
        : (ratingByTitleId.get(watch.title_id) ?? null),
      commentaire: watch.episode_id
        ? (commentByEpisodeId.get(watch.episode_id) ?? null)
        : (commentByTitleId.get(watch.title_id) ?? null),
    }));

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages };
  }

  // ======================================================================
  // HISTORIQUE TABULAIRE
  // ======================================================================

  /**
   * GET /watches/table
   * Tout l'historique de l'utilisateur, une ligne par visionnage, avec ce
   * qu'affiche la vue tableau : dates, genres, studios, réalisateurs, note
   * IMDb, moyenne des utilisateurs, note et commentaire perso, contexte
   * (support / compagnie / émotions) et listes contenant le titre.
   *
   * Renvoyé d'un bloc (tri, filtres et regroupement se font côté client) :
   * les données annexes sont chargées en quelques requêtes groupées, pas une
   * par ligne. Plafonné à HISTORY_TABLE_LIMIT visionnages (les plus récents).
   */
  async getHistoryTable(userId: string) {
    const HISTORY_TABLE_LIMIT = 5000;
    // Titres "porteurs" distincts : le film, ou la série de l'épisode.
    const titleIdsOf = (
      ws: Array<{ titles: { id: string } | null; episodes: { seasons: { titles: { id: string } } } | null }>,
    ) => [
      ...new Set(
        ws.map((w) => (w.titles ?? w.episodes?.seasons.titles ?? null)?.id).filter((id): id is string => !!id),
      ),
    ];
    const titleSelect = {
      id: true,
      titre_vo: true,
      titre_vf: true,
      type: true,
      date_sortie: true,
      note_imdb: true,
      affiche_url: true,
      duree_minutes: true,
    } as const;

    // Une seule transaction pour tout ce qui passe par la RLS de
    // l'utilisateur (visionnages, notes, listes), requêtes enchaînées : deux
    // transactions en parallèle peuvent se bloquer sur un pool de connexions
    // réduit (pooler Supabase), et le volume dépasse les délais par défaut
    // de Prisma (maxWait 2 s, timeout 5 s) pour un gros historique.
    const { watches, myRatings, lists } = await this.prisma.forUser(
      userId,
      async (tx) => {
        const watches = await tx.user_watches.findMany({
        where: { user_id: userId },
        orderBy: { date_vue: 'desc' },
        take: HISTORY_TABLE_LIMIT + 1,
        select: {
          id: true,
          date_vue: true,
          support: true,
          compagnie: true,
          emotion: true,
          title_id: true,
          episode_id: true,
          titles: { select: titleSelect },
          episodes: {
            select: {
              id: true,
              numero: true,
              titre: true,
              date_sortie: true,
              duree_minutes: true,
              seasons: { select: { numero: true, titles: { select: titleSelect } } },
            },
          },
        },
        });
        const kept = watches.slice(0, HISTORY_TABLE_LIMIT);
        const titleIds = titleIdsOf(kept);
        const hasEpisodes = kept.some((w) => w.episode_id);
        if (titleIds.length === 0) return { watches, myRatings: [], lists: [] };

        // Notes et commentaires perso, par titre et par épisode. Pas de liste
        // d'ids d'épisodes (plusieurs milliers pour un gros historique) : les
        // notes d'épisodes de l'utilisateur sont peu nombreuses, on les prend
        // toutes et la correspondance se fait par épisode plus bas.
        const myRatings = await tx.user_ratings.findMany({
          where: {
            user_id: userId,
            OR: [{ title_id: { in: titleIds } }, ...(hasEpisodes ? [{ episode_id: { not: null } }] : [])],
          },
          select: { title_id: true, episode_id: true, note_perso: true, commentaire: true },
        });
        // Listes visibles par l'utilisateur (les siennes et celles
        // partagées avec lui, RLS) qui contiennent ces titres.
        const lists = await tx.list_items.findMany({
          where: { title_id: { in: titleIds } },
          select: { title_id: true, user_lists: { select: { id: true, nom: true, type: true } } },
        });
        return { watches, myRatings, lists };
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
    const truncated = watches.length > HISTORY_TABLE_LIMIT;
    const rows = truncated ? watches.slice(0, HISTORY_TABLE_LIMIT) : watches;

    // Titre "porteur" de la ligne : le film, ou la série de l'épisode.
    const titleOf = (w: (typeof rows)[number]) => w.titles ?? w.episodes?.seasons.titles ?? null;
    const titleIds = titleIdsOf(rows);

    // Données de catalogue, hors RLS : pas de transaction, le pool de
    // connexions les sert à son rythme.
    const [genres, studios, directors] =
      titleIds.length === 0
        ? [[], [], []]
        : await Promise.all([
            this.prisma.title_genres.findMany({
              where: { title_id: { in: titleIds } },
              select: { title_id: true, genres: { select: { nom: true } } },
            }),
            this.prisma.title_studios.findMany({
              where: { title_id: { in: titleIds } },
              select: { title_id: true, studios: { select: { id: true, nom: true } } },
            }),
            this.prisma.credits.findMany({
              where: { title_id: { in: titleIds }, episode_id: null, roles: { code: 'realisateur' } },
              select: { title_id: true, people: { select: { id: true, nom: true } } },
            }),
          ]);

    // Moyenne des notes des utilisateurs de l'app (lignes avec une note
    // seulement), tous utilisateurs confondus : agrégat public, cf.
    // RatingsService.getTitleRatingsSummary.
    const averages =
      titleIds.length === 0
        ? []
        : await this.prisma.asSystem((tx) =>
            tx.user_ratings.groupBy({
              by: ['title_id'],
              where: { title_id: { in: titleIds }, note_perso: { not: null } },
              _avg: { note_perso: true },
              _count: { note_perso: true },
            }),
            { maxWait: 10_000, timeout: 30_000 },
          );

    const group = <T, V>(items: T[], key: (i: T) => string | null, value: (i: T) => V) => {
      const map = new Map<string, V[]>();
      for (const item of items) {
        const k = key(item);
        if (!k) continue;
        map.set(k, [...(map.get(k) ?? []), value(item)]);
      }
      return map;
    };
    // Dédoublonnage : la table credits contient des lignes en double (même
    // personne, même rôle, réinsérées à chaque synchro TMDB) — sans ça, un
    // réalisateur apparaissait plusieurs fois (ex. Surf's Up, Pan's Labyrinth).
    const uniqueBy = <T,>(items: T[], key: (i: T) => string) => [
      ...new Map(items.map((i) => [key(i), i])).values(),
    ];
    const genresBy = new Map(
      [...group(genres, (g) => g.title_id, (g) => g.genres.nom)].map(([k, v]) => [k, [...new Set(v)]]),
    );
    const studiosBy = new Map(
      [...group(studios, (s) => s.title_id, (s) => s.studios)].map(([k, v]) => [k, uniqueBy(v, (x) => x.id)]),
    );
    const directorsBy = new Map(
      [...group(directors, (d) => d.title_id, (d) => d.people)].map(([k, v]) => [k, uniqueBy(v, (x) => x.id)]),
    );
    const listsBy = group(lists, (l) => l.title_id, (l) => l.user_lists);
    const avgBy = new Map(
      averages.map((a) => [
        a.title_id as string,
        {
          moyenne: a._avg.note_perso !== null ? parseFloat(Number(a._avg.note_perso).toFixed(1)) : null,
          count: a._count.note_perso,
        },
      ]),
    );
    const myByTitle = new Map(myRatings.filter((r) => r.title_id).map((r) => [r.title_id as string, r]));
    const myByEpisode = new Map(myRatings.filter((r) => r.episode_id).map((r) => [r.episode_id as string, r]));
    const noteOf = (n: unknown) => (n === null || n === undefined ? null : Number(n));

    return {
      truncated,
      rows: rows.map((w) => {
        const title = titleOf(w);
        const tid = title?.id ?? null;
        const mine = w.episode_id ? myByEpisode.get(w.episode_id) : tid ? myByTitle.get(tid) : undefined;
        const avg = tid ? avgBy.get(tid) : undefined;
        return {
          watchId: w.id,
          dateVue: w.date_vue,
          title: title
            ? {
                id: title.id,
                titre: title.titre_vf || title.titre_vo,
                titreVo: title.titre_vo,
                type: title.type,
                afficheUrl: title.affiche_url,
              }
            : null,
          episode: w.episodes
            ? {
                id: w.episodes.id,
                saison: w.episodes.seasons.numero,
                numero: w.episodes.numero,
                titre: w.episodes.titre,
              }
            : null,
          // Date de publication : celle de l'épisode pour un épisode.
          dateSortie: w.episodes?.date_sortie ?? title?.date_sortie ?? null,
          // Durée : celle de l'épisode pour un épisode, du film sinon.
          duree: w.episodes ? w.episodes.duree_minutes ?? null : title?.duree_minutes ?? null,
          genres: (tid && genresBy.get(tid)) || [],
          studios: (tid && studiosBy.get(tid)) || [],
          realisateurs: (tid && directorsBy.get(tid)) || [],
          noteImdb: noteOf(title?.note_imdb),
          moyenneApp: avg?.moyenne ?? null,
          nombreNotesApp: avg?.count ?? 0,
          // Note et commentaire perso : ceux de l'épisode pour un épisode.
          notePerso: noteOf(mine?.note_perso),
          commentaire: mine?.commentaire ?? null,
          // Note et commentaire perso du titre lui-même (la série pour un
          // épisode) : utilisés quand le tableau regroupe par série.
          titreNotePerso: noteOf(tid ? myByTitle.get(tid)?.note_perso : null),
          titreCommentaire: (tid && myByTitle.get(tid)?.commentaire) || null,
          support: w.support,
          compagnie: w.compagnie,
          emotion: w.emotion ?? [],
          listes: (tid && listsBy.get(tid)) || [],
        };
      }),
    };
  }

  // ======================================================================
  // PROGRESSION (PL/pgSQL)
  // ======================================================================

  /**
   * Progression de visionnage par saison pour une série.
   *
   * Appelle la fonction PL/pgSQL fn_progress_serie via @emdb/db.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param titleId - UUID du titre (doit être une série)
   * @returns Progression par saison
   */
  async getSerieProgress(userId: string, titleId: string) {
    const title = await this.prisma.titles.findUnique({
      where: { id: titleId },
      select: { id: true, type: true },
    });

    if (!title) {
      throw new NotFoundException('Titre introuvable.');
    }

    if (title.type !== 'serie') {
      throw new BadRequestException('La progression est uniquement disponible pour les séries.');
    }

    return this.prisma.forUser(userId, (tx) => getSerieProgress(userId, titleId, tx));
  }

  /**
   * Calendrier de sortie : épisodes des séries suivies à venir à partir
   * d'aujourd'hui, triés par date croissante (le calendrier des épisodes
   * en retard/non vus indépendamment de la date est couvert séparément par
   * `getContinueWatching` / module "Continuer à regarder").
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param page - Page demandée (1-indexée), défaut 1
   * @param limit - Taille de page, défaut 100 (même plafond que /watches)
   * @returns Page d'épisodes des séries suivies à partir d'aujourd'hui
   *   (+ ceux sans date de sortie connue), triés par date croissante
   */
  async getCalendar(userId: string, page = 1, limit = 100) {
    const followedSeries = await this.prisma.user_follows_serie.findMany({
      where: { user_id: userId },
      select: { title_id: true },
    });

    if (followedSeries.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const titleIds = followedSeries.map((follow) => follow.title_id);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Le calendrier démarre à aujourd'hui et va croissant (retour
    // utilisateur) — épisodes déjà sortis avant aujourd'hui et non vus
    // exclus (backlog couvert par "Continuer à regarder" à la place). Les
    // épisodes sans date de sortie connue restent inclus (groupe "Date
    // inconnue" dédié côté frontend, cf. modification J) : ils ne sont ni
    // passés ni futurs, donc hors du champ de ce filtre.
    const where = {
      seasons: { title_id: { in: titleIds } },
      user_watches: { none: { user_id: userId } },
      OR: [{ date_sortie: { gte: startOfToday } }, { date_sortie: null }],
    };

    // where.user_watches (relation "none") touche user_watches (RLS) même si
    // `episodes` lui-même n'est pas une table protégée — sans contexte, la
    // condition "aucun visionnage" serait vraie pour TOUT épisode (RLS
    // masque tous les visionnages par défaut), affichant des épisodes déjà
    // vus comme non vus. forUser() indispensable ici.
    const [episodes, total] = await this.prisma.forUser(userId, (tx) =>
      Promise.all([
        tx.episodes.findMany({
          where,
          select: {
            numero: true,
            titre: true,
            date_sortie: true,
            duree_minutes: true,
            seasons: {
              select: {
                numero: true,
                title_id: true,
                titles: { select: { titre_vo: true, titre_vf: true, affiche_url: true } },
              },
            },
          },
          orderBy: { date_sortie: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        tx.episodes.count({ where }),
      ]),
    );

    // Calculé sur la page courante plutôt que via countEpisodesNonVus()/
    // fn_episodes_non_vus (PL/pgSQL) : évite une dépendance à une fonction
    // qui peut être absente de la base locale (bug #50) et évite N
    // requêtes supplémentaires (une par série suivie). Ne reflète que le
    // nombre d'épisodes de cette série présents sur CETTE page, pas le
    // total réel de la série — acceptable pour un badge indicatif.
    const nbNonVusParTitre = new Map<string, number>();
    for (const episode of episodes) {
      const titleId = episode.seasons.title_id;
      nbNonVusParTitre.set(titleId, (nbNonVusParTitre.get(titleId) ?? 0) + 1);
    }

    const items = episodes.map((episode) => ({
      title_id: episode.seasons.title_id,
      titre_vo: episode.seasons.titles.titre_vo,
      titre_vf: episode.seasons.titles.titre_vf,
      affiche_url: episode.seasons.titles.affiche_url,
      saison: episode.seasons.numero,
      episode_numero: episode.numero,
      episode_titre: episode.titre,
      date_diffusion: episode.date_sortie,
      duree_minutes: episode.duree_minutes,
      nb_non_vus: nbNonVusParTitre.get(episode.seasons.title_id) ?? 0,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Séries suivies avec au moins un épisode restant à voir (modification U,
   * module accueil "Continuer à regarder") — une entrée par série, portant
   * sur son PROCHAIN épisode non vu (pas la série en tant que telle : le
   * titre affiché est celui de la série, mais l'action "marquer comme vu"
   * porte sur cet épisode précis). Triées par
   * MAX(date du dernier épisode vu, date de sortie du dernier épisode)
   * décroissant — une série jamais commencée mais dont un nouvel épisode
   * vient de sortir remonte donc aussi haut qu'une série activement suivie.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @returns Prochain épisode à voir par série suivie, triés par pertinence
   */
  async getContinueWatching(userId: string) {
    const followedSeries = await this.prisma.user_follows_serie.findMany({
      where: { user_id: userId },
      select: {
        title_id: true,
        titles: {
          select: { id: true, titre_vo: true, titre_vf: true, affiche_url: true },
        },
      },
    });

    if (followedSeries.length === 0) {
      return [];
    }

    const titleIds = followedSeries.map((follow) => follow.title_id);

    // Exclure les séries de la watchlist marquées "à jour" ou "abandonnée"
    // (elles ne doivent plus apparaître dans "Continuer à regarder").
    const excludedTitleIds = await this.prisma.forUser(userId, async (tx) => {
      const watchlist = await tx.user_lists.findFirst({
        where: { user_id: userId, type: 'watchlist' },
        select: { id: true },
      });
      if (!watchlist) {
        return new Set<string>();
      }
      const excludedItems = await tx.list_items.findMany({
        where: {
          list_id: watchlist.id,
          title_id: { in: titleIds },
          statut: { in: ['a_jour', 'abandonnee'] },
        },
        select: { title_id: true },
      });
      return new Set(excludedItems.map((item) => item.title_id));
    });
    const activeTitleIds = titleIds.filter((id) => !excludedTitleIds.has(id));
    if (activeTitleIds.length === 0) {
      return [];
    }

    // Triés par saison puis numéro : le premier épisode non vu rencontré
    // pour une série donnée, dans cet ordre, est son prochain épisode à
    // voir (ordre de visionnage naturel, pas l'ordre de sortie — un
    // épisode spécial "saison 0" antérieur à la sortie ne doit pas
    // perturber la progression narrative). Spéciaux (saison 0) et épisodes
    // pas encore sortis (date_sortie future ou inconnue) exclus : ils ne
    // comptent ni dans le total ni comme prochain épisode, sinon le badge
    // "X/Y" affiche un max que l'utilisateur ne peut pas encore atteindre.
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    // include.user_watches touche la table RLS-protegee : forUser() requis
    // (sinon aucun visionnage visible, "prochain episode" toujours faux).
    const episodes = await this.prisma.forUser(userId, (tx) =>
      tx.episodes.findMany({
        where: {
          seasons: { title_id: { in: activeTitleIds }, numero: { not: 0 } },
          date_sortie: { lte: today },
        },
        select: {
          id: true,
          numero: true,
          titre: true,
          date_sortie: true,
          duree_minutes: true,
          seasons: { select: { numero: true, title_id: true } },
          user_watches: {
            where: { user_id: userId },
            select: { date_vue: true },
            orderBy: { date_vue: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ seasons: { numero: 'asc' } }, { numero: 'asc' }],
      }),
    );

    type Agg = {
      total: number;
      watched: number;
      lastWatchedAt: Date | null;
      lastAiredAt: Date | null;
      nextEpisode: {
        id: string;
        saison: number;
        numero: number;
        titre: string | null;
        duree_minutes: number | null;
      } | null;
    };
    const aggByTitle = new Map<string, Agg>();

    for (const episode of episodes) {
      const titleId = episode.seasons.title_id;
      const agg = aggByTitle.get(titleId) ?? {
        total: 0,
        watched: 0,
        lastWatchedAt: null,
        lastAiredAt: null,
        nextEpisode: null,
      };

      agg.total += 1;

      const lastWatch = episode.user_watches[0];
      if (lastWatch) {
        agg.watched += 1;
        if (!agg.lastWatchedAt || lastWatch.date_vue > agg.lastWatchedAt) {
          agg.lastWatchedAt = lastWatch.date_vue;
        }
      } else if (!agg.nextEpisode) {
        agg.nextEpisode = {
          id: episode.id,
          saison: episode.seasons.numero,
          numero: episode.numero,
          titre: episode.titre,
          duree_minutes: episode.duree_minutes,
        };
      }

      if (episode.date_sortie && (!agg.lastAiredAt || episode.date_sortie > agg.lastAiredAt)) {
        agg.lastAiredAt = episode.date_sortie;
      }

      aggByTitle.set(titleId, agg);
    }

    return followedSeries
      .map((follow) => {
        const agg = aggByTitle.get(follow.title_id);
        // Pas d'épisode restant (rien importé, ou série entièrement vue) :
        // rien à "continuer" pour cette série.
        if (!agg || !agg.nextEpisode) {
          return null;
        }

        const sortDate =
          agg.lastWatchedAt && agg.lastAiredAt
            ? agg.lastWatchedAt > agg.lastAiredAt
              ? agg.lastWatchedAt
              : agg.lastAiredAt
            : (agg.lastWatchedAt ?? agg.lastAiredAt);

        return {
          title_id: follow.title_id,
          titre_vo: follow.titles.titre_vo,
          titre_vf: follow.titles.titre_vf,
          affiche_url: follow.titles.affiche_url,
          episode_id: agg.nextEpisode.id,
          saison: agg.nextEpisode.saison,
          episode_numero: agg.nextEpisode.numero,
          episode_titre: agg.nextEpisode.titre,
          duree_minutes: agg.nextEpisode.duree_minutes,
          total_episodes: agg.total,
          episodes_vus: agg.watched,
          episodes_restants: agg.total - agg.watched,
          sort_date: sortDate,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => {
        const aTime = a.sort_date ? new Date(a.sort_date).getTime() : 0;
        const bTime = b.sort_date ? new Date(b.sort_date).getTime() : 0;
        return bTime - aTime;
      });
  }

  // ======================================================================
  // FOLLOWS
  // ======================================================================

  /**
   * Suivre une série.
   *
   * Vérification applicative : le titre doit être de type 'serie'.
   * La contrainte UNIQUE(user_id, title_id) empêche les doublons.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param titleId - UUID du titre (doit être une série)
   * @returns Le follow créé
   */
  async follow(userId: string, titleId: string) {
    const title = await this.prisma.titles.findUnique({
      where: { id: titleId },
      select: { id: true, type: true },
    });

    if (!title) {
      throw new NotFoundException('Titre introuvable.');
    }

    if (title.type !== 'serie') {
      throw new BadRequestException('Seules les séries peuvent être suivies.');
    }

    return this.prisma.user_follows_serie.create({
      data: {
        user_id: userId,
        title_id: titleId,
      },
      include: {
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            titre_vo: true,
            titre_vf: true,
            affiche_url: true,
          },
        },
      },
    });
  }

  /**
   * Ne plus suivre une série.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param titleId - UUID du titre
   */
  async unfollow(userId: string, titleId: string): Promise<void> {
    const follow = await this.prisma.user_follows_serie.findUnique({
      where: {
        user_id_title_id: { user_id: userId, title_id: titleId },
      },
    });

    if (!follow) {
      throw new NotFoundException('Vous ne suivez pas cette série.');
    }

    await this.prisma.user_follows_serie.delete({
      where: {
        user_id_title_id: { user_id: userId, title_id: titleId },
      },
    });
  }

  /**
   * Liste des séries suivies par l'utilisateur.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @returns Liste des séries suivies
   */
  async getFollowedSeries(userId: string) {
    const follows = await this.prisma.user_follows_serie.findMany({
      where: { user_id: userId },
      include: {
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            titre_vo: true,
            titre_vf: true,
            affiche_url: true,
            type: true,
            next_episode_air_date: true,
          },
        },
      },
      orderBy: { followed_at: 'desc' },
    });

    return follows.map((f) => ({
      ...f.titles,
      followed_at: f.followed_at,
    }));
  }
}
