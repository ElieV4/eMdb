import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getTrending, getDiscoverMovie, getDiscoverTv } from '@emdb/tmdb-client';

/**
 * Résultat d'un module de découverte — même forme que
 * `TitlesService.searchTitles()` (TMDB + local mergé), avec en plus
 * `note_imdb`/`date_sortie`, disponibles directement dans les réponses TMDB
 * trending/discover (contrairement à la recherche simple).
 */
export interface DiscoverTitleResult {
  tmdb_id: number;
  titre_vo: string;
  titre_vf: string | null;
  poster_path: string | null;
  type: 'film' | 'serie';
  note_imdb: number | null;
  date_sortie: string | null;
  local: boolean;
  local_id?: string;
}

const DISCOVER_MODULES = ['tendances', 'populaires', 'attendus', 'sorties'] as const;
export type DiscoverModule = (typeof DISCOVER_MODULES)[number];

type RawTmdbItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  popularity?: number;
};

/**
 * Service métier pour la page "Découvrir" (modification G).
 *
 * Chaque module interroge TMDB directement (trending/discover), plutôt que
 * la base locale (contrairement à `usePopularTitles` de la home, qui ne
 * liste que les titres déjà importés) — le but est de faire découvrir du
 * contenu externe, importé à la demande au clic (mécanisme "get or import"
 * déjà en place, cf. `GET /titles/tmdb/:tmdbId`).
 *
 * TMDB n'a pas d'équivalent direct pour "Attendus" (most anticipated) : on
 * substitue par les titres non encore sortis triés par popularité TMDB
 * décroissante, algo proposé et documenté dans docs/bugs.md (modification G).
 */
@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  async getModule(module: string, limit: number): Promise<DiscoverTitleResult[]> {
    switch (module as DiscoverModule) {
      case 'tendances':
        return this.getTrending(limit);
      case 'populaires':
        return this.getPopular(limit);
      case 'attendus':
        return this.getUpcoming(limit);
      case 'sorties':
        return this.getReleases(limit);
      default:
        throw new BadRequestException(
          `Module de découverte invalide. Valeurs possibles : ${DISCOVER_MODULES.join(', ')}.`,
        );
    }
  }

  private async getTrending(limit: number): Promise<DiscoverTitleResult[]> {
    const [movies, tv] = await Promise.all([
      getTrending('movie', 'week'),
      getTrending('tv', 'week'),
    ]);

    return this.mergeAndFinalize(
      [
        ...this.mapItems(movies.results ?? [], 'film'),
        ...this.mapItems(tv.results ?? [], 'serie'),
      ],
      (a, b) => b.popularity - a.popularity,
      limit,
    );
  }

  private async getPopular(limit: number): Promise<DiscoverTitleResult[]> {
    const [movies, tv] = await Promise.all([
      getDiscoverMovie({ sort_by: 'popularity.desc' }),
      getDiscoverTv({ sort_by: 'popularity.desc' }),
    ]);

    return this.mergeAndFinalize(
      [
        ...this.mapItems(movies.results ?? [], 'film'),
        ...this.mapItems(tv.results ?? [], 'serie'),
      ],
      (a, b) => b.popularity - a.popularity,
      limit,
    );
  }

  private async getUpcoming(limit: number): Promise<DiscoverTitleResult[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);

    const [movies, tv] = await Promise.all([
      getDiscoverMovie({
        sort_by: 'popularity.desc',
        'primary_release_date.gte': tomorrowIso,
      }),
      getDiscoverTv({
        sort_by: 'popularity.desc',
        'first_air_date.gte': tomorrowIso,
      }),
    ]);

    return this.mergeAndFinalize(
      [
        ...this.mapItems(movies.results ?? [], 'film'),
        ...this.mapItems(tv.results ?? [], 'serie'),
      ],
      (a, b) => b.popularity - a.popularity,
      limit,
    );
  }

  private async getReleases(limit: number): Promise<DiscoverTitleResult[]> {
    const today = new Date().toISOString().slice(0, 10);

    // vote_count élevé : sans ce filtre, "sorties" remonte des titres très
    // obscurs (parfois une seule note à 10) plutôt que de vraies sorties
    // grand public.
    const [movies, tv] = await Promise.all([
      getDiscoverMovie({
        sort_by: 'primary_release_date.desc',
        'primary_release_date.lte': today,
        'vote_count.gte': 50,
      }),
      getDiscoverTv({
        sort_by: 'first_air_date.desc',
        'first_air_date.lte': today,
        'vote_count.gte': 50,
      }),
    ]);

    return this.mergeAndFinalize(
      [
        ...this.mapItems(movies.results ?? [], 'film'),
        ...this.mapItems(tv.results ?? [], 'serie'),
      ],
      (a, b) => (b.date_sortie ?? '').localeCompare(a.date_sortie ?? ''),
      limit,
    );
  }

  private mapItems(
    items: RawTmdbItem[],
    type: 'film' | 'serie',
  ): (DiscoverTitleResult & { popularity: number })[] {
    return items.map((item) => {
      const titre = type === 'film' ? item.title : item.name;
      const original = type === 'film' ? item.original_title : item.original_name;
      const dateSortie = type === 'film' ? item.release_date : item.first_air_date;

      return {
        tmdb_id: item.id,
        titre_vo: original || titre || '',
        titre_vf: titre ?? null,
        poster_path: item.poster_path ?? null,
        type,
        note_imdb: item.vote_average ?? null,
        date_sortie: dateSortie || null,
        local: false,
        popularity: item.popularity ?? 0,
      };
    });
  }

  /**
   * Trie, tronque à `limit`, puis marque les résultats déjà présents en
   * local via leur `tmdb_id` (même principe que `TitlesService.searchTitles`).
   */
  private async mergeAndFinalize(
    items: (DiscoverTitleResult & { popularity: number })[],
    sort: (a: DiscoverTitleResult & { popularity: number }, b: DiscoverTitleResult & { popularity: number }) => number,
    limit: number,
  ): Promise<DiscoverTitleResult[]> {
    const sliced = items.sort(sort).slice(0, limit);

    const tmdbIds = sliced.map((item) => item.tmdb_id);
    const localTitles = await this.prisma.titles.findMany({
      where: { tmdb_id: { in: tmdbIds } },
      select: { id: true, tmdb_id: true },
    });
    const localByTmdbId = new Map(
      localTitles.filter((t) => t.tmdb_id !== null).map((t) => [t.tmdb_id as number, t.id]),
    );

    return sliced.map(({ popularity, ...item }) => ({
      ...item,
      local: localByTmdbId.has(item.tmdb_id),
      local_id: localByTmdbId.get(item.tmdb_id),
    }));
  }
}
