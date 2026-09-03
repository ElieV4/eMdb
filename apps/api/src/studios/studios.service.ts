import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getDiscoverMovie, getDiscoverTv } from '@emdb/tmdb-client';
import { importTitleByTmdbId } from '@emdb/tmdb-sync';

/**
 * Service métier pour le module studios.
 *
 * Reprend la structure du module people (détail + filmographie + "connexes")
 * appliquée aux studios de production : détail, filmographie (titres via
 * title_studios) et personnes les plus associées au studio (calculé à partir
 * des credits des titres du studio, faute d'équivalent TMDB direct).
 */
@Injectable()
export class StudiosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche locale de studios par nom (contains, insensible à la casse) —
   * pas de recherche/import TMDB à la volée, contrairement aux titres/
   * personnes : la table `studios` n'est peuplée que passivement (sociétés
   * de production des titres déjà importés).
   */
  async search(q: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { nom: { contains: q, mode: 'insensitive' as const } };

    const [items, total] = await Promise.all([
      this.prisma.studios.findMany({
        where,
        select: { id: true, tmdb_id: true, nom: true, logo_url: true },
        orderBy: { nom: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.studios.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Détail d'un studio.
   *
   * @param id - UUID du studio
   * @throws NotFoundException si le studio n'existe pas
   */
  async getById(id: string) {
    const studio = await this.prisma.studios.findUnique({
      where: { id },
      select: { id: true, tmdb_id: true, nom: true, logo_url: true },
    });

    if (!studio) {
      throw new NotFoundException('Studio introuvable.');
    }

    return studio;
  }

  /**
   * Filmographie d'un studio : titres via title_studios, groupés par type
   * (Films / Séries) et triés par date de sortie décroissante. Même forme de
   * réponse que PeopleService.getFilmography (FilmographyGrouped) pour
   * réutiliser le composant frontend `Filmography` tel quel.
   *
   * @param id - UUID du studio
   * @throws NotFoundException si le studio n'existe pas
   */
  async getFilmography(id: string) {
    const studio = await this.prisma.studios.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!studio) {
      throw new NotFoundException('Studio introuvable.');
    }

    const links = await this.prisma.title_studios.findMany({
      where: { studio_id: id },
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
            title_genres: {
              select: {
                genre_id: true,
                genres: { select: { id: true, nom: true } },
              },
            },
            title_countries: {
              select: {
                country_id: true,
                countries: { select: { id: true, nom: true } },
              },
            },
          },
        },
      },
    });

    const grouped: Record<string, any[]> = {};

    for (const link of links) {
      if (!link.titles) continue;
      const groupKey = link.titles.type === 'serie' ? 'Séries' : 'Films';

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }

      grouped[groupKey].push({
        id: link.titles.id,
        personnage: null,
        ordre: null,
        titre: link.titles,
        episode_id: null,
      });
    }

    for (const group of Object.keys(grouped)) {
      grouped[group].sort((a: any, b: any) => {
        const dateA = a.titre?.date_sortie ? new Date(a.titre.date_sortie).getTime() : 0;
        const dateB = b.titre?.date_sortie ? new Date(b.titre.date_sortie).getTime() : 0;
        return dateB - dateA;
      });
    }

    return grouped;
  }

  /**
   * "Personnes connexes" d'un studio : les personnes les plus créditées sur
   * les titres du studio (pas de recommandation TMDB pour les studios, donc
   * calculé localement plutôt que bootstrap TMDB comme pour les personnes).
   *
   * @param id - UUID du studio
   * @param limit - Nombre max de personnes retournées
   * @throws NotFoundException si le studio n'existe pas
   */
  async getRelatedPeople(id: string, limit = 12) {
    const studio = await this.prisma.studios.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!studio) {
      throw new NotFoundException('Studio introuvable.');
    }

    const titleLinks = await this.prisma.title_studios.findMany({
      where: { studio_id: id },
      select: { title_id: true },
    });

    const titleIds = titleLinks.map((link) => link.title_id);
    if (titleIds.length === 0) {
      return [];
    }

    const credits = await this.prisma.credits.findMany({
      where: { title_id: { in: titleIds }, episode_id: null },
      select: { person_id: true },
    });

    const countByPerson = new Map<string, number>();
    for (const credit of credits) {
      countByPerson.set(credit.person_id, (countByPerson.get(credit.person_id) ?? 0) + 1);
    }

    const topPersonIds = Array.from(countByPerson.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([personId]) => personId);

    if (topPersonIds.length === 0) {
      return [];
    }

    const people = await this.prisma.people.findMany({
      where: { id: { in: topPersonIds } },
      select: { id: true, tmdb_id: true, nom: true, photo_url: true, genre: true, bio: true },
    });

    const peopleById = new Map(people.map((p) => [p.id, p]));
    return topPersonIds.map((personId) => peopleById.get(personId)).filter(Boolean);
  }

  // ======================================================================
  // SUIVI (bookmark simple — pas d'auto-watchlist, contrairement aux
  // personnes suivies : un studio n'a pas d'équivalent TMDB "combined
  // credits" pour détecter ses futurs titres sans un scan coûteux)
  // ======================================================================

  async followStudio(userId: string, studioId: string) {
    const studio = await this.prisma.studios.findUnique({
      where: { id: studioId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio introuvable.');
    }

    return this.prisma.user_follows_studio.create({
      data: { user_id: userId, studio_id: studioId },
    });
  }

  async unfollowStudio(userId: string, studioId: string): Promise<void> {
    const follow = await this.prisma.user_follows_studio.findUnique({
      where: { user_id_studio_id: { user_id: userId, studio_id: studioId } },
    });
    if (!follow) {
      throw new NotFoundException('Vous ne suivez pas ce studio.');
    }

    await this.prisma.user_follows_studio.delete({
      where: { user_id_studio_id: { user_id: userId, studio_id: studioId } },
    });
  }

  async getFollowedStudios(userId: string) {
    const follows = await this.prisma.user_follows_studio.findMany({
      where: { user_id: userId },
      include: {
        studios: { select: { id: true, tmdb_id: true, nom: true, logo_url: true } },
      },
      orderBy: { followed_at: 'desc' },
    });

    return follows.map((f) => ({ ...f.studios, followed_at: f.followed_at }));
  }

  /**
   * Rafraîchit la filmographie d'un studio depuis TMDB — contrairement aux
   * personnes (un seul appel `combined_credits` renvoie tout), TMDB n'a pas
   * d'endpoint "tous les titres d'une société" : on interroge `discover`
   * (films puis séries) filtré par `with_companies`, trié par popularité,
   * borné à quelques pages pour rester raisonnable sur un gros studio
   * (ex. Warner Bros a des milliers de titres) plutôt que tout importer.
   */
  async refreshFilmography(id: string) {
    const studio = await this.prisma.studios.findUnique({
      where: { id },
      select: { id: true, tmdb_id: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio introuvable.');
    }
    if (!studio.tmdb_id) {
      throw new NotFoundException("Ce studio n'a pas de tmdb_id, impossible de rafraîchir.");
    }

    const MAX_PAGES = 5;
    const tmdbIdsByType: { tmdbId: number; type: 'film' | 'serie' }[] = [];

    for (const [type, discover] of [
      ['film', getDiscoverMovie],
      ['serie', getDiscoverTv],
    ] as const) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const data = await discover({
          with_companies: studio.tmdb_id,
          sort_by: 'popularity.desc',
          page,
        });
        const results = data?.results ?? [];
        for (const item of results) {
          if (item?.id) tmdbIdsByType.push({ tmdbId: item.id, type });
        }
        if (page >= (data?.total_pages ?? 1)) break;
      }
    }

    const uniqueByKey = new Map(tmdbIdsByType.map((t) => [`${t.type}:${t.tmdbId}`, t]));

    const existing = await this.prisma.titles.findMany({
      where: { tmdb_id: { in: [...uniqueByKey.values()].map((t) => t.tmdbId) } },
      select: { tmdb_id: true },
    });
    const existingTmdbIds = new Set(existing.map((t) => t.tmdb_id));

    let imported = 0;
    let failed = 0;
    for (const { tmdbId, type } of uniqueByKey.values()) {
      if (existingTmdbIds.has(tmdbId)) continue;
      try {
        await importTitleByTmdbId(tmdbId, type, { withCredits: false });
        imported++;
      } catch {
        failed++;
      }
    }

    return { titlesImported: imported, titlesFailed: failed, filmography: await this.getFilmography(id) };
  }
}
