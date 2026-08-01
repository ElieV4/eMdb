import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
