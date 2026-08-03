import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListTitlesFilterDto } from './dto/list-titles-filter.dto';
import {
  getMovieRecommendations,
  getMovieSimilar,
  getTvRecommendations,
  getTvSimilar,
  searchMovie,
  searchTv,
  TmdbSearchResult,
} from '@emdb/tmdb-client';
import { importTitleByTmdbId } from '@emdb/tmdb-sync';

/**
 * Résultat fusionné d'une recherche TMDB + résultats locaux.
 */
export interface TitleSearchResult {
  tmdb_id: number;
  titre_vo: string;
  titre_vf: string | null;
  poster_path: string | null;
  type: 'film' | 'serie';
  local: boolean;
  local_id?: string;
}

/**
 * Résultat paginé d'une liste de titres.
 */
export interface PaginatedTitles {
  data: any[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Résultat de recherche de titres, avec le total réel (TMDB total_results
 * des sources interrogées + résultats locaux sans tmdb_id) — pas seulement
 * la portion chargée par la page courante (scroll infini sur `/search`).
 */
export interface SearchTitlesResult {
  items: TitleSearchResult[];
  total: number;
}

/**
 * Service métier pour le module titles (Phase 3.3).
 *
 * Gère la recherche (TMDB + local), l'import "get or import", le détail
 * complet, la liste paginée avec filtres, les recommandations, le rafraîchissement
 * et la suppression conditionnelle (orphan check).
 */
@Injectable()
export class TitlesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche un titre via TMDB + résultats locaux, fusionnés.
   *
   * Appelle tmdb-client.searchMovie/searchTv selon le type, puis recherche
   * localement (titre_vo/titre_vf ILIKE). Marque les résultats déjà présents
   * localement via tmdb_id.
   *
   * @param query - Texte de recherche
   * @param type - 'film' | 'serie' | undefined (recherche les deux si absent)
   * @param page - Page TMDB (1-indexée, ~20 résultats par source et par
   *   page) — transmise telle quelle à `searchMovie`/`searchTv`, pour le
   *   scroll infini sur `/search`.
   * @returns Liste fusionnée de résultats + total réel (toutes pages confondues)
   */
  async searchTitles(
    query: string,
    type?: 'film' | 'serie',
    page: number = 1,
  ): Promise<SearchTitlesResult> {
    // 1. Appels TMDB
    let tmdbResults: Array<TmdbSearchResult & { type: 'film' | 'serie' }> = [];
    let tmdbTotal = 0;

    if (type === 'film' || !type) {
      const movieResults = await searchMovie(query, undefined, page);
      tmdbResults = [...tmdbResults, ...movieResults.results.map((r) => ({ ...r, type: 'film' as const }))];
      tmdbTotal += movieResults.totalResults;
    }

    if (type === 'serie' || !type) {
      const tvResults = await searchTv(query, undefined, page);
      tmdbResults = [...tmdbResults, ...tvResults.results.map((r) => ({ ...r, type: 'serie' as const }))];
      tmdbTotal += tvResults.totalResults;
    }

    // 2. Recherche locale (ILIKE sur titre_vo / titre_vf)
    const localResults = await this.prisma.titles.findMany({
      where: {
        OR: [
          { titre_vo: { contains: query, mode: 'insensitive' } },
          { titre_vf: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        tmdb_id: true,
        titre_vo: true,
        titre_vf: true,
        affiche_url: true,
        type: true,
      },
    });

    // 3. Index local par tmdb_id pour le merge
    const localByTmdbId = new Map<number, any>();
    for (const local of localResults) {
      if (local.tmdb_id) {
        localByTmdbId.set(local.tmdb_id, local);
      }
    }

    // 4. Fusion : marquer les résultats TMDB déjà présents localement
    const merged: TitleSearchResult[] = [];

    for (const tmdb of tmdbResults) {
      const local = localByTmdbId.get(tmdb.id);
      const titreVo = tmdb.title ?? tmdb.name ?? '';
      merged.push({
        tmdb_id: tmdb.id,
        titre_vo: titreVo,
        titre_vf: titreVo || null,
        poster_path: tmdb.poster_path ?? null,
        type: tmdb.type,
        local: !!local,
        local_id: local?.id,
      });
    }

    // 5. Ajouter les résultats locaux sans tmdb_id (import manuel) —
    // uniquement sur la première page : ce lot n'est pas paginé par TMDB
    // (recherche locale complète à chaque appel), le répéter sur chaque
    // page dupliquerait ces entrées lors de l'accumulation en scroll infini.
    let localOnlyCount = 0;
    if (page === 1) {
      for (const local of localResults) {
        if (!local.tmdb_id) {
          localOnlyCount++;
          merged.push({
            tmdb_id: 0,
            titre_vo: local.titre_vo,
            titre_vf: local.titre_vf,
            poster_path: local.affiche_url,
            type: local.type as 'film' | 'serie',
            local: true,
            local_id: local.id,
          });
        }
      }
    }

    // `total` : total réel toutes pages confondues (TMDB total_results est
    // stable quelle que soit la page interrogée) + résultats locaux sans
    // tmdb_id, ajoutés une seule fois (page 1) — pas la taille de `merged`
    // qui ne reflète que la page courante.
    return { items: merged, total: tmdbTotal + localOnlyCount };
  }

  /**
   * Liste de référence de tous les genres (public), pour les menus de filtre.
   */
  async listGenres() {
    return this.prisma.genres.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    });
  }

  /**
   * Liste de référence de tous les pays (public), pour les menus de filtre.
   */
  async listCountries() {
    return this.prisma.countries.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    });
  }

  /**
   * Liste de référence de tous les studios (public), pour les menus de
   * filtre (nouveau filtre "Studio" du module dataviz).
   */
  async listStudios() {
    return this.prisma.studios.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    });
  }

  /**
   * "Get or import" : cherche un titre par tmdb_id, sinon déclenche l'import.
   *
   * @param tmdbId - ID TMDB du titre
   * @param type - 'film' | 'serie'
   * @returns Le titre importé ou existant
   */
  async getOrImportByTmdbId(tmdbId: number, type: 'film' | 'serie') {
    console.log('[getOrImportByTmdbId] start', tmdbId, type);
    const existing = await this.prisma.titles.findUnique({
      where: { tmdb_id: tmdbId },
    }).catch((error) => {
      console.error('[getOrImportByTmdbId] findUnique failed', tmdbId, type, error);
      throw error;
    });

    if (existing) {
      console.log('[getOrImportByTmdbId] existing', tmdbId, existing.id);
      return existing;
    }

    try {
      console.log('[getOrImportByTmdbId] importing', tmdbId, type);
      const result = await importTitleByTmdbId(tmdbId, type);
      console.log('[getOrImportByTmdbId] success', tmdbId, type, (result as any)?.id);
      return result;
    } catch (error: any) {
      const message =
        error?.stack || error?.message || `Impossible d'importer le titre TMDB ${tmdbId} (${type}).`;
      console.error('[getOrImportByTmdbId] failed', tmdbId, type, message);
      throw new BadRequestException(message);
    }
  }

  /**
   * Détail complet d'un titre : titre + genres + pays + studios + saisons (si série).
   *
   * @param id - UUID du titre
   * @returns Le titre avec ses relations
   * @throws NotFoundException si le titre n'existe pas
   */
  async getTitleDetail(id: string) {
    const title = await this.prisma.titles.findUnique({
      where: { id },
      include: {
        title_genres: {
          include: {
            genres: {
              select: { id: true, nom: true, tmdb_id: true },
            },
          },
        },
        title_countries: {
          include: {
            countries: {
              select: { id: true, code: true, nom: true },
            },
          },
        },
        title_studios: {
          include: {
            studios: {
              select: { id: true, nom: true, logo_url: true },
            },
          },
        },
        seasons: {
          orderBy: { numero: 'asc' },
          include: {
            episodes: {
              orderBy: { numero: 'asc' },
            },
          },
        },
      },
    });

    if (!title) {
      throw new NotFoundException('Titre introuvable.');
    }

    return title;
  }

  /**
   * Liste/pagination de titres avec filtres.
   *
   * Filtres : type, genre_id, country_id, is_animation, note_imdb_min
   * Tri : date_sortie | note_imdb (asc/desc)
   *
   * @param filters - DTO de filtres + pagination
   * @returns Résultat paginé
   */
  async listTitles(filters: ListTitlesFilterDto): Promise<PaginatedTitles> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const sortBy = filters.sort_by ?? 'date_sortie';
    const sortOrder = filters.sort_order ?? 'desc';

    const where: any = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.is_animation !== undefined) {
      where.is_animation = filters.is_animation;
    }

    if (filters.note_imdb_min !== undefined) {
      where.note_imdb = { gte: filters.note_imdb_min };
    }

    if (filters.genre_id) {
      where.title_genres = {
        some: { genre_id: filters.genre_id },
      };
    }

    if (filters.country_id) {
      where.title_countries = {
        some: { country_id: filters.country_id },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.titles.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          title_genres: {
            include: { genres: { select: { id: true, nom: true } } },
          },
          title_countries: {
            include: { countries: { select: { id: true, code: true, nom: true } } },
          },
        },
      }),
      this.prisma.titles.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Recommandations d'un titre.
   *
   * Lit la table title_recommendations. Si vide, fallback sur l'API TMDB
   * (getMovieRecommendations/getMovieSimilar ou getTvRecommendations/getTvSimilar).
   *
   * @param id - UUID du titre
   * @returns Liste de titres recommandés
   * @throws NotFoundException si le titre n'existe pas
   */
  async getRecommendations(id: string) {
    const title = await this.prisma.titles.findUnique({
      where: { id },
      select: { id: true, tmdb_id: true, type: true },
    });

    if (!title) {
      throw new NotFoundException('Titre introuvable.');
    }

    // 1. Vérifier les recommandations locales
    const localRecs = await this.prisma.title_recommendations.findMany({
      where: { title_id: id },
      include: {
        titles_title_recommendations_recommended_idTotitles: {
          select: {
            id: true,
            tmdb_id: true,
            titre_vo: true,
            titre_vf: true,
            affiche_url: true,
            type: true,
            note_imdb: true,
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    if (localRecs.length > 0) {
      return localRecs.map((rec) => rec.titles_title_recommendations_recommended_idTotitles);
    }

    // 2. Fallback TMDB si pas de recommandations locales
    if (!title.tmdb_id) {
      return [];
    }

    let tmdbRecs: any[] = [];
    let tmdbSimilar: any[] = [];

    if (title.type === 'film') {
      const [recs, similar] = await Promise.all([
        getMovieRecommendations(title.tmdb_id),
        getMovieSimilar(title.tmdb_id),
      ]);
      tmdbRecs = recs.results || [];
      tmdbSimilar = similar.results || [];
    } else {
      const [recs, similar] = await Promise.all([
        getTvRecommendations(title.tmdb_id),
        getTvSimilar(title.tmdb_id),
      ]);
      tmdbRecs = recs.results || [];
      tmdbSimilar = similar.results || [];
    }

    // 3. Fusionner et mapper vers titres locaux si présents
    const allRecs = [...tmdbRecs, ...tmdbSimilar];
    const seenIds = new Set<number>();
    const uniqueRecs: any[] = [];

    for (const rec of allRecs) {
      if (rec.id && !seenIds.has(rec.id)) {
        seenIds.add(rec.id);
        uniqueRecs.push(rec);
      }
    }

    const results: any[] = [];
    for (const rec of uniqueRecs) {
      const localTitle = await this.prisma.titles.findUnique({
        where: { tmdb_id: rec.id },
        select: {
          id: true,
          tmdb_id: true,
          titre_vo: true,
          titre_vf: true,
          affiche_url: true,
          type: true,
          note_imdb: true,
        },
      });

      if (localTitle) {
        results.push(localTitle);
      } else {
        // Titre pas encore en local — retourner les infos TMDB de base
        results.push({
          tmdb_id: rec.id,
          titre_vo: rec.title ?? rec.name ?? null,
          titre_vf: rec.title ?? rec.name ?? null,
          affiche_url: rec.poster_path ? `https://image.tmdb.org/t/p/w500${rec.poster_path}` : null,
          type: title.type,
          note_imdb: rec.vote_average ?? null,
        });
      }
    }

    return results;
  }

  /**
   * Rafraîchit les données d'un titre depuis TMDB, casting inclus.
   *
   * Appelle tmdb-sync.importTitleByTmdbId (mêmes upserts qu'un import
   * initial : genres/pays/studios/credits, + saisons/épisodes pour une
   * série) plutôt que refreshTitleData, qui ne ré-importe pas les credits —
   * nécessaire pour les titres importés sans casting (ex. backfill Trakt en
   * masse) : c'est le seul moyen de les compléter après coup depuis l'UI.
   *
   * @param id - UUID du titre
   * @returns Le titre mis à jour
   */
  async refreshTitle(id: string) {
    const title = await this.prisma.titles.findUnique({
      where: { id },
      select: { id: true, tmdb_id: true, type: true },
    });

    if (!title) {
      throw new NotFoundException('Titre introuvable.');
    }

    if (!title.tmdb_id) {
      throw new BadRequestException("Le titre n'a pas de tmdb_id, impossible de rafraîchir.");
    }

    return importTitleByTmdbId(title.tmdb_id, title.type as 'film' | 'serie', { withCredits: true });
  }

  /**
   * Supprime un titre uniquement s'il est orphelin
   * (aucune user_ratings, user_watches ou list_items ne le référence).
   *
   * @param id - UUID du titre
   * @throws NotFoundException si le titre n'existe pas
   * @throws BadRequestException si le titre a des références
   */
  async deleteIfOrphan(id: string): Promise<void> {
    const title = await this.prisma.titles.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!title) {
      throw new NotFoundException('Titre introuvable.');
    }

    // Vérifier les références
    const [ratingsCount, watchesCount, listItemsCount] = await Promise.all([
      this.prisma.user_ratings.count({ where: { title_id: id } }),
      this.prisma.user_watches.count({ where: { title_id: id } }),
      this.prisma.list_items.count({ where: { title_id: id } }),
    ]);

    const totalRefs = ratingsCount + watchesCount + listItemsCount;

    if (totalRefs > 0) {
      throw new BadRequestException(
        `Le titre ne peut pas être supprimé : il est référencé par ${ratingsCount} note(s), ${watchesCount} visionnage(s) et ${listItemsCount} item(s) de liste.`,
      );
    }

    await this.prisma.titles.delete({ where: { id } });
  }
}
