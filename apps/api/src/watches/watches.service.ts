import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWatchDto } from './dto/create-watch.dto';
import { ListWatchesFilterDto } from './dto/list-watches-filter.dto';
import { countEpisodesNonVus, getSerieProgress } from '@emdb/db';

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
  constructor(private readonly prisma: PrismaService) {}

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
    if (title_id) {
      const title = await this.prisma.titles.findUnique({
        where: { id: title_id },
        select: { id: true },
      });
      if (!title) {
        throw new NotFoundException('Titre introuvable.');
      }
    }

    if (episode_id) {
      const episode = await this.prisma.episodes.findUnique({
        where: { id: episode_id },
        select: { id: true },
      });
      if (!episode) {
        throw new NotFoundException('Épisode introuvable.');
      }
    }

    return this.prisma.user_watches.create({
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
   * Marque tous les épisodes d'une série comme vus jusqu'à un épisode donné.
   *
   * Trouve tous les épisodes du titre dont le numéro de saison est inférieur
   * à celui de l'épisode cible, ou dans la même saison mais avec un numéro
   * d'épisode inférieur ou égal. Crée un visionnage pour chacun.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param titleId - UUID du titre (série)
   * @param episodeId - UUID de l'épisode jusqu'auquel marquer comme vu
   * @param dateVue - Date du visionnage (optionnelle, défaut: maintenant)
   * @returns Nombre de visionnages créés
   */
  async createWatchesUntilEpisode(
    userId: string,
    titleId: string,
    episodeId: string,
    dateVue?: string,
  ): Promise<number> {
    // Vérifier que l'épisode existe et récupérer sa saison/numéro
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

    // Vérifier que l'épisode appartient bien au titre
    if (targetEpisode.seasons.title_id !== titleId) {
      throw new BadRequestException("Cet épisode n'appartient pas à ce titre.");
    }

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

    await this.prisma.user_watches.createMany({
      data: newWatches.map((e) => ({
        user_id: userId,
        title_id: titleId,
        episode_id: e.id,
        date_vue: dateVueValue,
      })),
    });

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
  async listWatches(userId: string, filters: ListWatchesFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };

    if (filters.date_from || filters.date_to) {
      where.date_vue = {};
      if (filters.date_from) where.date_vue.gte = filters.date_from;
      if (filters.date_to) where.date_vue.lte = filters.date_to;
    }

    if (filters.title_id) {
      where.title_id = filters.title_id;
    }

    if (filters.type) {
      // Un watch porte soit sur un titre directement (title_id, films et
      // séries "vues" sans épisode précis), soit sur un épisode (episode_id,
      // title_id alors null) — cf. createWatch(). Filtrer uniquement sur
      // `titles.type` (relation directe) ignore donc tous les visionnages
      // d'épisodes, qui sont pourtant l'essentiel des visionnages de séries
      // (bug #44) : il faut aussi suivre episode → season → title.
      if (filters.type === 'serie') {
        where.OR = [
          { titles: { type: 'serie' } },
          { episodes: { seasons: { titles: { type: 'serie' } } } },
        ];
      } else {
        // Un épisode appartient toujours à une série, jamais à un film.
        where.titles = { type: 'film' };
      }
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
      }),
      this.prisma.user_watches.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items: data, total, page, limit, totalPages };
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
   * Calendrier des épisodes non vus.
   *
   * Pour chaque série suivie par l'utilisateur, calcule le nombre d'épisodes
   * non vus (fn_episodes_non_vus) et retourne les infos de la série.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @returns Liste des séries suivies avec nb_non_vus
   */
  async getCalendar(userId: string) {
    const followedSeries = await this.prisma.user_follows_serie.findMany({
      where: { user_id: userId },
      include: {
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            titre_vo: true,
            titre_vf: true,
            affiche_url: true,
            next_episode_air_date: true,
          },
        },
      },
    });

    if (followedSeries.length === 0) {
      return [];
    }

    const results = [];

    for (const follow of followedSeries) {
      const nbNonVus = await countEpisodesNonVus(userId, follow.title_id);

      results.push({
        title_id: follow.title_id,
        titre_vo: follow.titles.titre_vo,
        titre_vf: follow.titles.titre_vf,
        affiche_url: follow.titles.affiche_url,
        next_episode_air_date: follow.titles.next_episode_air_date,
        nb_non_vus: nbNonVus,
      });
    }

    // Trier par nb_non_vus décroissant
    results.sort((a, b) => b.nb_non_vus - a.nb_non_vus);

    return results;
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
