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

    const watch = await this.prisma.user_watches.create({
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
      await this.prisma.list_items.deleteMany({
        where: {
          title_id: title.id,
          user_lists: { user_id: userId, type: 'watchlist' },
        },
      });
    }

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
    const watch = await this.prisma.user_watches.findUnique({
      where: { id },
      select: { id: true, user_id: true },
    });

    if (!watch) {
      throw new NotFoundException('Visionnage introuvable.');
    }

    if (watch.user_id !== userId) {
      throw new ForbiddenException('Ce visionnage ne vous appartient pas.');
    }

    await this.prisma.user_watches.delete({ where: { id } });
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
    const watch = await this.prisma.user_watches.findUnique({
      where: { id },
      select: { id: true, user_id: true },
    });

    if (!watch) {
      throw new NotFoundException('Visionnage introuvable.');
    }

    if (watch.user_id !== userId) {
      throw new ForbiddenException('Ce visionnage ne vous appartient pas.');
    }

    return this.prisma.user_watches.update({
      where: { id },
      data: {
        ...(dto.support !== undefined && { support: dto.support }),
        ...(dto.compagnie !== undefined && { compagnie: dto.compagnie }),
        ...(dto.emotion !== undefined && { emotion: dto.emotion }),
      },
    });
  }

  /**
   * Supprime tous les visionnages d'un titre pour un utilisateur.
   *
   * @param titleId - UUID du titre
   * @param userId - UUID de l'utilisateur connecté
   */
  async deleteAllWatchesByTitle(titleId: string, userId: string): Promise<void> {
    await this.prisma.user_watches.deleteMany({
      where: { title_id: titleId, user_id: userId },
    });
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
    await this.prisma.user_watches.deleteMany({
      where: { episode_id: episodeId, user_id: userId },
    });
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
    const existingWatches = await this.prisma.user_watches.findMany({
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
      return 0;
    }

    // title_id reste null sur les visionnages d'épisode (même invariant que
    // createWatch : jamais les deux à la fois, cf. bug #22/#24 — sinon
    // useWatchedTitles() marquerait toute la série "vue" dès le premier
    // "vu jusqu'ici" au lieu de suivre l'avancement épisode par épisode).
    await this.prisma.user_watches.createMany({
      data: newWatches.map((e) => ({
        user_id: userId,
        title_id: null,
        episode_id: e.id,
        date_vue: dateVueValue,
      })),
    });

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
    const watches = await this.prisma.user_watches.findMany({
      where: { user_id: userId },
      select: {
        title_id: true,
        episodes: { select: { seasons: { select: { title_id: true } } } },
      },
    });

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

    const [data, total] = await Promise.all([
      this.prisma.user_watches.findMany({
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
      this.prisma.user_watches.count({ where }),
    ]);

    // Note personnelle par visionnage (affichée en sous-titre à la place de
    // la durée dans l'Historique) — pas de relation directe user_watches ->
    // user_ratings, jointure manuelle limitée aux titres/épisodes de cette
    // page plutôt qu'un lookup par item.
    const titleIds = [...new Set(data.filter((w) => w.title_id).map((w) => w.title_id as string))];
    const episodeIds = [...new Set(data.filter((w) => w.episode_id).map((w) => w.episode_id as string))];
    const ratings =
      titleIds.length > 0 || episodeIds.length > 0
        ? await this.prisma.user_ratings.findMany({
            where: {
              user_id: userId,
              OR: [
                ...(titleIds.length > 0 ? [{ title_id: { in: titleIds } }] : []),
                ...(episodeIds.length > 0 ? [{ episode_id: { in: episodeIds } }] : []),
              ],
            },
            select: { title_id: true, episode_id: true, note_perso: true },
          })
        : [];
    const ratingByTitleId = new Map(ratings.filter((r) => r.title_id).map((r) => [r.title_id, Number(r.note_perso)]));
    const ratingByEpisodeId = new Map(
      ratings.filter((r) => r.episode_id).map((r) => [r.episode_id, Number(r.note_perso)]),
    );

    const items = data.map((watch) => ({
      ...watch,
      note_perso: watch.episode_id
        ? (ratingByEpisodeId.get(watch.episode_id) ?? null)
        : (ratingByTitleId.get(watch.title_id) ?? null),
    }));

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages };
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

    return getSerieProgress(userId, titleId);
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

    const [episodes, total] = await Promise.all([
      this.prisma.episodes.findMany({
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
      this.prisma.episodes.count({ where }),
    ]);

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
    const watchlist = await this.prisma.user_lists.findFirst({
      where: { user_id: userId, type: 'watchlist' },
      select: { id: true },
    });
    let excludedTitleIds = new Set<string>();
    if (watchlist) {
      const excludedItems = await this.prisma.list_items.findMany({
        where: {
          list_id: watchlist.id,
          title_id: { in: titleIds },
          statut: { in: ['a_jour', 'abandonnee'] },
        },
        select: { title_id: true },
      });
      excludedTitleIds = new Set(excludedItems.map((item) => item.title_id));
    }
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
    const episodes = await this.prisma.episodes.findMany({
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
    });

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
