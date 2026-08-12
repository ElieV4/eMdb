import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { searchPerson, getPersonCombinedCredits, TmdbSearchResult } from '@emdb/tmdb-client';
import {
  importPersonByTmdbId,
  importTitleByTmdbId,
  refreshPersonData,
  resolvePersonWikiUrl,
  bootstrapPersonRecommendationsFromTmdb,
  ensureCreditRecord,
  resolveCrewRole,
} from '@emdb/tmdb-sync';

/**
 * Interface pour le résultat fusionné d'une recherche TMDB + local.
 */
export interface PersonSearchResult {
  tmdb_id: number;
  nom: string;
  photo_url: string | null;
  local: boolean;
  local_id?: string;
}

/**
 * Résultat de recherche de personnes, avec le total réel (TMDB total_results
 * + résultats locaux non mergés) — pas seulement la portion chargée par la
 * page courante (scroll infini sur `/search`).
 */
export interface SearchPeopleResult {
  items: PersonSearchResult[];
  total: number;
}

/**
 * Service métier pour le module people (Phase 3.4).
 *
 * Gère la recherche (TMDB + local), l'import "get or import", le détail
 * complet d'une personne, sa filmographie, ses recommandations et le
 * rafraîchissement périodique depuis TMDB.
 */
@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sélection des champs publics pour une personne.
   */
  private readonly PERSON_PUBLIC_SELECT = {
    id: true,
    tmdb_id: true,
    nom: true,
    genre: true,
    date_naissance: true,
    pays_id: true,
    photo_url: true,
    bio: true,
    wiki_url: true,
    source: true,
    created_at: true,
    countries: {
      select: {
        id: true,
        code: true,
        nom: true,
      },
    },
  } as const;

  /**
   * Recherche une personne via TMDB + résultats locaux, fusionnés.
   *
   * Appelle tmdb-client.searchPerson, puis recherche localement (nom ILIKE).
   * Marque les résultats déjà présents localement via tmdb_id.
   *
   * @param query - Texte de recherche
   * @param page - Page TMDB (1-indexée), pour le scroll infini sur /search
   * @returns Liste fusionnée de résultats
   */
  async search(query: string, page: number = 1): Promise<SearchPeopleResult> {
    // 1. Appel TMDB
    let tmdbResults: TmdbSearchResult[] = [];
    let tmdbTotal = 0;
    try {
      const tmdbPage = await searchPerson(query, page);
      tmdbResults = tmdbPage.results;
      tmdbTotal = tmdbPage.totalResults;
    } catch {
      // En cas d'échec TMDB (API key manquante, réseau…), on continue
      // avec les seuls résultats locaux.
    }

    // 2. Recherche locale (ILIKE sur nom)
    const localResults = await this.prisma.people.findMany({
      where: {
        nom: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        tmdb_id: true,
        nom: true,
        photo_url: true,
      },
    });

    // 3. Index local par tmdb_id pour le merge
    const localByTmdbId = new Map<number, (typeof localResults)[0]>();
    for (const local of localResults) {
      if (local.tmdb_id) {
        localByTmdbId.set(local.tmdb_id, local);
      }
    }

    // 4. Fusion
    const merged: PersonSearchResult[] = [];
    const seenTmdbIds = new Set<number>();
    const mergedLocalIds = new Set<string>();

    for (const tmdb of tmdbResults) {
      if (seenTmdbIds.has(tmdb.id)) continue;
      seenTmdbIds.add(tmdb.id);

      const local = localByTmdbId.get(tmdb.id);
      if (local) {
        mergedLocalIds.add(local.id);
      }

      merged.push({
        tmdb_id: tmdb.id,
        nom: tmdb.title ?? tmdb.name ?? '',
        photo_url: tmdb.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : null,
        local: !!local,
        local_id: local?.id,
      });
    }

    // 5. Ajouter les résultats locaux non encore mergés via TMDB
    // (ceux avec un tmdb_id mais qui n'étaient pas dans les résultats TMDB,
    //  et ceux sans tmdb_id importés manuellement) — uniquement en page 1 :
    // ce lot n'est pas paginé par TMDB, le répéter sur chaque page
    // dupliquerait ces entrées lors de l'accumulation en scroll infini.
    let localOnlyCount = 0;
    if (page === 1) {
      for (const local of localResults) {
        if (mergedLocalIds.has(local.id)) continue;

        localOnlyCount++;
        merged.push({
          tmdb_id: local.tmdb_id ?? 0,
          nom: local.nom,
          photo_url: local.photo_url,
          local: true,
          local_id: local.id,
        });
      }
    }

    // `total` : total réel toutes pages confondues (TMDB total_results est
    // stable quelle que soit la page interrogée) + résultats locaux non
    // mergés, ajoutés une seule fois (page 1) — pas la taille de `merged`
    // qui ne reflète que la page courante.
    return { items: merged, total: tmdbTotal + localOnlyCount };
  }

  /**
   * "Get or import" : cherche une personne par tmdb_id, sinon déclenche l'import.
   *
   * @param tmdbId - ID TMDB de la personne
   * @returns La personne importée ou existante
   */
  async getOrImportByTmdbId(tmdbId: number) {
    // Validation
    if (!Number.isInteger(tmdbId) || tmdbId < 1) {
      throw new BadRequestException('ID TMDB invalide.');
    }

    const existing = await this.prisma.people.findUnique({
      where: { tmdb_id: tmdbId },
      include: {
        countries: {
          select: { id: true, code: true, nom: true },
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Déclenche l'import via tmdb-sync
    return importPersonByTmdbId(tmdbId);
  }

  /**
   * Détail complet d'une personne.
   *
   * @param id - UUID de la personne
   * @returns La personne avec son pays
   * @throws NotFoundException si la personne n'existe pas
   */
  async getById(id: string) {
    const person = await this.prisma.people.findUnique({
      where: { id },
      select: this.PERSON_PUBLIC_SELECT,
    });

    if (!person) {
      throw new NotFoundException('Personne introuvable.');
    }

    // wiki_url résolu à la demande, ici seulement (jamais pendant un import
    // de titre, cf. importPersonByTmdbId) : la fiche de CETTE personne vient
    // d'être consultée, c'est le seul moment pertinent pour cet appel
    // Wikidata. `resolvePersonWikiUrl` sert le cache déjà en base s'il
    // existe, sinon résout et persiste pour les consultations suivantes.
    if (!person.wiki_url) {
      const wikiUrl = await resolvePersonWikiUrl(id);
      if (wikiUrl) {
        person.wiki_url = wikiUrl;
      }
    }

    return person;
  }

  /**
   * Filmographie d'une personne : jointure credits → titles, groupée par rôle,
   * triée par date de sortie.
   *
   * Lit uniquement les données en base. Pour importer les titres TMDB manquants,
   * utiliser refreshFilmography().
   *
   * @param id - UUID de la personne
   * @returns Liste des crédits groupés par rôle
   * @throws NotFoundException si la personne n'existe pas
   */
  async getFilmography(id: string) {
    const person = await this.prisma.people.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!person) {
      throw new NotFoundException('Personne introuvable.');
    }

    // Lire les crédits en base
    const credits = await this.prisma.credits.findMany({
      where: { person_id: id },
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
        roles: {
          select: { code: true, libelle: true },
        },
      },
      orderBy: {
        ordre: 'asc',
      },
    });

    // Dédupliquer par (title_id, role_id) en gardant le premier
    // (évite les doublons causés par episode_id = NULL)
    const seen = new Set<string>();
    const uniqueCredits = credits.filter((credit) => {
      const key = `${credit.title_id}-${credit.role_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Grouper par rôle
    const grouped: Record<string, any[]> = {};

    for (const credit of uniqueCredits) {
      const roleKey = credit.roles?.libelle ?? 'Autre';

      if (!grouped[roleKey]) {
        grouped[roleKey] = [];
      }

      grouped[roleKey].push({
        id: credit.id,
        personnage: credit.personnage,
        ordre: credit.ordre,
        titre: credit.titles,
        episode_id: credit.episode_id,
      });
    }

    // Trier les titres de chaque groupe par date de sortie (desc)
    for (const role of Object.keys(grouped)) {
      grouped[role].sort((a: any, b: any) => {
        const dateA = a.titre?.date_sortie ? new Date(a.titre.date_sortie).getTime() : 0;
        const dateB = b.titre?.date_sortie ? new Date(b.titre.date_sortie).getTime() : 0;
        return dateB - dateA;
      });
    }

    return grouped;
  }

  /**
   * Recommandations d'une personne.
   *
   * Lit la table person_recommendations. Si aucune recommandation locale n'existe
   * et que la personne a un tmdb_id, déclenche un fallback TMDB via
   * bootstrapPersonRecommendationsFromTmdb.
   *
   * @param id - UUID de la personne
   * @returns Liste de personnes recommandées
   * @throws NotFoundException si la personne n'existe pas
   */
  async getRecommendations(id: string) {
    const person = await this.prisma.people.findUnique({
      where: { id },
      select: { id: true, tmdb_id: true },
    });

    if (!person) {
      throw new NotFoundException('Personne introuvable.');
    }

    // 1. Vérifier les recommandations locales
    const recs = await this.prisma.person_recommendations.findMany({
      where: { person_id: id },
      include: {
        people_person_recommendations_recommended_idTopeople: {
          select: {
            id: true,
            tmdb_id: true,
            nom: true,
            photo_url: true,
            genre: true,
            bio: true,
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    if (recs.length > 0) {
      return recs.map(
        (rec: { people_person_recommendations_recommended_idTopeople: any }) =>
          rec.people_person_recommendations_recommended_idTopeople,
      );
    }

    // 2. Fallback TMDB si pas de recommandations locales
    if (!person.tmdb_id) {
      return [];
    }

    try {
      await bootstrapPersonRecommendationsFromTmdb(id);
    } catch {
      return []; // Silencieux en cas d'échec TMDB
    }

    // 3. Re-lire les recommandations après bootstrap
    const newRecs = await this.prisma.person_recommendations.findMany({
      where: { person_id: id },
      include: {
        people_person_recommendations_recommended_idTopeople: {
          select: {
            id: true,
            tmdb_id: true,
            nom: true,
            photo_url: true,
            genre: true,
            bio: true,
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    return newRecs.map(
      (rec: { people_person_recommendations_recommended_idTopeople: any }) =>
        rec.people_person_recommendations_recommended_idTopeople,
    );
  }

  /**
   * Rafraîchit les données d'une personne depuis TMDB.
   *
   * Appelle tmdb-sync.refreshPersonData (bio, photo, wiki_url, etc.).
   *
   * @param id - UUID de la personne
   * @returns La personne mise à jour
   * @throws NotFoundException si la personne n'existe pas
   * @throws BadRequestException si la personne n'a pas de tmdb_id
   */
  async refresh(id: string) {
    const person = await this.prisma.people.findUnique({
      where: { id },
      select: { id: true, tmdb_id: true },
    });

    if (!person) {
      throw new NotFoundException('Personne introuvable.');
    }

    if (!person.tmdb_id) {
      throw new BadRequestException("La personne n'a pas de tmdb_id, impossible de rafraîchir.");
    }

    return refreshPersonData(id);
  }

  /**
   * Rafraîchit la filmographie d'une personne depuis TMDB.
   *
   * 1. Récupère les crédits combinés TMDB de la personne (getPersonCombinedCredits)
   * 2. Pour chaque titre TMDB non présent en local, déclenche importTitleByTmdbId
   * 3. Retourne la filmographie mise à jour via getFilmography()
   *
   * @param id - UUID de la personne
   * @returns La filmographie mise à jour (groupée par rôle)
   * @throws NotFoundException si la personne n'existe pas
   * @throws BadRequestException si la personne n'a pas de tmdb_id
   */
  async refreshFilmography(id: string) {
    const person = await this.prisma.people.findUnique({
      where: { id },
      select: { id: true, tmdb_id: true },
    });

    if (!person) {
      throw new NotFoundException('Personne introuvable.');
    }

    if (!person.tmdb_id) {
      throw new BadRequestException("La personne n'a pas de tmdb_id, impossible de rafraîchir la filmographie.");
    }

    // 1. Récupérer les crédits combinés TMDB de cette personne (déjà scopés à
    // elle seule : chaque entrée porte son propre character/job pour le titre).
    const tmdbCredits = await getPersonCombinedCredits(person.tmdb_id);

    type CombinedCastCredit = { id: number; media_type: 'movie' | 'tv'; character?: string | null; order?: number | null };
    type CombinedCrewCredit = { id: number; media_type: 'movie' | 'tv'; job?: string | null };

    const castCredits: CombinedCastCredit[] = (tmdbCredits.cast ?? []).filter((c: CombinedCastCredit) => !!c?.id);
    const crewCredits: CombinedCrewCredit[] = (tmdbCredits.crew ?? []).filter((c: CombinedCrewCredit) => !!c?.id);

    if (castCredits.length === 0 && crewCredits.length === 0) {
      return this.getFilmography(id);
    }

    const mediaTypeByTmdbId = new Map<number, 'film' | 'serie'>();
    for (const credit of [...castCredits, ...crewCredits]) {
      mediaTypeByTmdbId.set(credit.id, credit.media_type === 'movie' ? 'film' : 'serie');
    }

    // 2. Vérifier quels titres existent déjà en local
    const tmdbTitleIds = Array.from(mediaTypeByTmdbId.keys());
    const existingTitles = await this.prisma.titles.findMany({
      where: { tmdb_id: { in: tmdbTitleIds } },
      select: { id: true, tmdb_id: true },
    });

    const titleIdByTmdbId = new Map<number, string>(
      existingTitles
        .filter((t) => t.tmdb_id !== null)
        .map((t) => [t.tmdb_id as number, t.id]),
    );

    // 3. Importer les titres manquants — sans le casting/l'équipe complète
    // (withCredits: false) : on connaît déjà le rôle exact de CETTE personne
    // via getPersonCombinedCredits (étape 4), inutile de réimporter en plus
    // tous les autres acteurs/techniciens de chaque titre pour retrouver cette
    // seule ligne de credit. C'est ce qui rendait le refresh extrêmement long
    // pour les personnes prolifiques (des dizaines de titres × casting complet
    // de chacun). En parallèle : le rate limiter TMDB (@emdb/tmdb-client) fait
    // déjà la queue nécessaire, donc lancer tous les imports d'un coup ne
    // dépasse pas le quota, ça raccourcit juste le temps total d'attente.
    const missingTmdbIds = tmdbTitleIds.filter((tmdbId) => !titleIdByTmdbId.has(tmdbId));

    await Promise.all(
      missingTmdbIds.map(async (tmdbId) => {
        const type = mediaTypeByTmdbId.get(tmdbId) ?? 'film';
        try {
          const title = await importTitleByTmdbId(tmdbId, type, { withCredits: false });
          titleIdByTmdbId.set(tmdbId, title.id);
        } catch (error) {
          // Silencieux : on continue même si un titre échoue
          console.warn(`[refreshFilmography] Échec import titre TMDB ${tmdbId}:`, error);
        }
      }),
    );

    // 4. Créer le credit reliant cette personne à chaque titre (qu'il vienne
    // d'être importé ou qu'il existait déjà sans avoir encore ce credit —
    // ex. importé via le refresh d'une autre personne).
    await Promise.all([
      ...castCredits.map(async (credit) => {
        const titleId = titleIdByTmdbId.get(credit.id);
        if (!titleId) return; // import du titre a échoué
        try {
          await ensureCreditRecord({
            titleId,
            personId: person.id,
            role: 'acteur',
            roleLibelle: 'Acteur',
            personnage: credit.character ?? null,
            ordre: credit.order ?? null,
          });
        } catch (error) {
          console.warn(`[refreshFilmography] Échec création credit acteur (titre TMDB ${credit.id}):`, error);
        }
      }),
      ...crewCredits.map(async (credit) => {
        const titleId = titleIdByTmdbId.get(credit.id);
        if (!titleId) return;
        const { code, libelle } = resolveCrewRole(credit.job);
        try {
          await ensureCreditRecord({
            titleId,
            personId: person.id,
            role: code,
            roleLibelle: libelle,
            personnage: credit.job ?? null,
          });
        } catch (error) {
          console.warn(`[refreshFilmography] Échec création credit équipe (titre TMDB ${credit.id}):`, error);
        }
      }),
    ]);

    // 5. Retourner la filmographie mise à jour
    return this.getFilmography(id);
  }

  // ======================================================================
  // SUIVI DE PERSONNES
  // ======================================================================

  /**
   * Suit une personne : ses futurs titres seront ajoutés automatiquement à
   * la watchlist de l'utilisateur (cf. checkFollowedPersonsForNewTitles,
   * appelée par le cron quotidien du worker).
   */
  async followPerson(userId: string, personId: string) {
    const person = await this.prisma.people.findUnique({
      where: { id: personId },
      select: { id: true },
    });
    if (!person) {
      throw new NotFoundException('Personne introuvable.');
    }

    return this.prisma.user_follows_person.create({
      data: { user_id: userId, person_id: personId },
    });
  }

  async unfollowPerson(userId: string, personId: string): Promise<void> {
    const follow = await this.prisma.user_follows_person.findUnique({
      where: { user_id_person_id: { user_id: userId, person_id: personId } },
    });
    if (!follow) {
      throw new NotFoundException('Vous ne suivez pas cette personne.');
    }

    await this.prisma.user_follows_person.delete({
      where: { user_id_person_id: { user_id: userId, person_id: personId } },
    });
  }

  /**
   * Liste des personnes suivies par l'utilisateur — alimente la sous-page
   * dédiée et le module "Personnes suivies" de l'accueil.
   */
  async getFollowedPeople(userId: string) {
    const follows = await this.prisma.user_follows_person.findMany({
      where: { user_id: userId },
      include: {
        people: {
          select: { id: true, tmdb_id: true, nom: true, photo_url: true },
        },
      },
      orderBy: { followed_at: 'desc' },
    });

    return follows.map((f) => ({ ...f.people, followed_at: f.followed_at }));
  }
}
