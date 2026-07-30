import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service métier pour le module credits (Phase 3.6).
 *
 * Gère l'exposition des crédits (cast/crew) au niveau titre.
 * Les crédits au niveau épisode et personne sont déjà couverts
 * respectivement par SeasonsEpisodesService et PeopleService.
 */
@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne les crédits d'un titre, groupés par rôle.
   *
   * Cast (role='acteur') trié par ordre asc.
   * Crew (réalisateur, scénariste, autre) groupé par rôle.
   * Seuls les crédits sans episode_id sont retournés
   * (crédits génériques du titre, pas les guest stars d'épisode).
   *
   * @param titleId - UUID du titre
   * @returns Objet groupé par rôle : { "Acteur": [...], "Réalisateur": [...], ... }
   * @throws NotFoundException si le titre n'existe pas
   */
  async getTitleCredits(titleId: string) {
    // Vérifier que le titre existe
    const title = await this.prisma.titles.findUnique({
      where: { id: titleId },
      select: { id: true },
    });

    if (!title) {
      throw new NotFoundException('Titre introuvable.');
    }

    // Récupérer les credits du titre (sans episode_id = credits génériques)
    // Déduplication nécessaire car la contrainte unique sur
    // (title_id, person_id, role_id, episode_id) ne fonctionne pas
    // correctement quand episode_id est NULL (SQL traite chaque NULL comme distinct)
    const credits = await this.prisma.credits.findMany({
      where: {
        title_id: titleId,
        episode_id: null,
      },
      include: {
        people: {
          select: {
            id: true,
            tmdb_id: true,
            nom: true,
            photo_url: true,
          },
        },
        roles: {
          select: { code: true, libelle: true },
        },
      },
      orderBy: {
        ordre: 'asc',
      },
    });

    // Dédupliquer par (person_id, role_id) en gardant le premier
    const seen = new Set<string>();
    const uniqueCredits = credits.filter((credit) => {
      const key = `${credit.person_id}-${credit.role_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Grouper par rôle
    const grouped: Record<
      string,
      Array<{
        id: string;
        personnage: string | null;
        ordre: number | null;
        personne: {
          id: string;
          tmdb_id: number | null;
          nom: string;
          photo_url: string | null;
        };
      }>
    > = {};

    for (const credit of uniqueCredits) {
      const roleKey = credit.roles?.libelle ?? 'Autre';

      if (!grouped[roleKey]) {
        grouped[roleKey] = [];
      }

      grouped[roleKey].push({
        id: credit.id,
        personnage: credit.personnage,
        ordre: credit.ordre,
        personne: {
          id: credit.people.id,
          tmdb_id: credit.people.tmdb_id,
          nom: credit.people.nom,
          photo_url: credit.people.photo_url,
        },
      });
    }

    return grouped;
  }
}
