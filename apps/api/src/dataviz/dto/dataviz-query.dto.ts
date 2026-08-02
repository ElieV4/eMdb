import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { DatavizFilterQueryDto } from './dataviz-filter-query.dto';

/**
 * Menu de configuration unifié, identique pour les 8 visuels dataviz de la
 * page Profil — remplace les DTOs `summary`/`breakdown`/`by-year` (chacun
 * avait sa propre forme figée) par un unique `GET /dataviz/query`.
 *
 * - `duration` : durée (minutes) — agrégations sum/min/max/avg/evolution.
 * - `watches` : visionnages, granularité épisode (une série de 10 épisodes
 *   vus compte pour 10) — count/distinctCount/min/max/avg/evolution.
 * - `titles` : titres, granularité titre (la même série compte pour 1) —
 *   count/distinctCount/min/max/avg/evolution. `count` et `distinctCount`
 *   sont ici strictement identiques (COUNT(DISTINCT titre) dans les deux
 *   cas) : offerts malgré tout pour la cohérence du menu avec les 2 autres
 *   métriques de comptage.
 * - `note` : note IMDB des titres regardés (dédupliqués par titre, pas par
 *   visionnage) — count/distinctCount/min/max/avg/evolution.
 *
 * Restriction (imposée aussi côté frontend, dans le choix des options du
 * menu) : pour `watches`/`titles`, choisir min/max/avg/evolution ne
 * conserve que les groupements `none`/`period` — ces agrégations comparent
 * des compteurs par période (ex. "moyenne de visionnages par mois"), pas de
 * sens par genre/pays/studio/type de média.
 */
export type DatavizMetric = 'duration' | 'watches' | 'titles' | 'note';
export type DatavizAggregation = 'sum' | 'count' | 'distinctCount' | 'min' | 'max' | 'avg' | 'evolution';
export type DatavizGroupBy = 'none' | 'mediaType' | 'period' | 'genre' | 'country' | 'studio';
export type DatavizMediaType = 'film' | 'serie';

export const ALLOWED_AGGREGATIONS: Record<DatavizMetric, DatavizAggregation[]> = {
  duration: ['sum', 'min', 'max', 'avg', 'evolution'],
  watches: ['count', 'distinctCount', 'min', 'max', 'avg', 'evolution'],
  titles: ['count', 'distinctCount', 'min', 'max', 'avg', 'evolution'],
  note: ['count', 'distinctCount', 'min', 'max', 'avg', 'evolution'],
};

/** Granularité de "Période" — cf. `DatavizService.periodCategoryExpr`. */
export type DatavizGranularity =
  | 'day'
  | 'month'
  | 'quarter'
  | 'year'
  | 'hour'
  | 'dayQuarter'
  | 'weekday'
  | 'monthOfYear'
  | 'season';

export class DatavizQueryDto extends DatavizFilterQueryDto {
  @IsEnum(['duration', 'watches', 'titles', 'note'])
  metric!: DatavizMetric;

  @IsEnum(['sum', 'count', 'distinctCount', 'min', 'max', 'avg', 'evolution'])
  aggregation!: DatavizAggregation;

  @IsEnum(['none', 'mediaType', 'period', 'genre', 'country', 'studio'])
  groupBy!: DatavizGroupBy;

  /**
   * Second axe de répartition ("Légende") — divise chaque barre/point du
   * groupement principal en plusieurs séries (barchart) ou trace plusieurs
   * lignes (linechart). Mêmes valeurs que `groupBy`, dont `none` (pas de
   * légende — comportement par défaut). Seulement pris en compte par le
   * chemin standard (count/distinctCount/sum/min/max) — ignoré pour
   * evolution/note+avg/watches+titres restreint (cf.
   * `DatavizService.queryRows`).
   */
  @IsOptional()
  @IsEnum(['none', 'mediaType', 'period', 'genre', 'country', 'studio'])
  legendBy?: DatavizGroupBy;

  @IsOptional()
  @IsEnum(['day', 'month', 'quarter', 'year', 'hour', 'dayQuarter', 'weekday', 'monthOfYear', 'season'])
  granularity?: DatavizGranularity;

  /** Filtre "Type de média" (tout/film/série) — distinct du groupement `mediaType`. */
  @IsOptional()
  @IsEnum(['film', 'serie'])
  mediaType?: DatavizMediaType;

  /** Filtre "Année de visionnage" (slicer) — distinct de `releaseYearMin/Max` (année de sortie). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  watchedYearMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  watchedYearMax?: number;
}
