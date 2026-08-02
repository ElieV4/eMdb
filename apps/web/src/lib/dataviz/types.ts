/**
 * Types pour le module Dataviz — modification W, menu unifié (8ème passe).
 * Un seul endpoint alimente les 8 visuels : `GET /dataviz/query`, chacun
 * avec son propre menu métrique/agrégation/groupement/filtres.
 */

export type DatavizMetric = "duration" | "watches" | "titles" | "note";
export type DatavizAggregation = "sum" | "count" | "distinctCount" | "min" | "max" | "avg" | "evolution";
export type DatavizGroupBy = "none" | "mediaType" | "period" | "genre" | "country" | "studio";
export type DatavizMediaType = "film" | "serie";

/**
 * Agrégations valides par métrique (reflète `ALLOWED_AGGREGATIONS` côté
 * backend) — pilote les options affichées dans le menu "Agrégation".
 */
export const ALLOWED_AGGREGATIONS: Record<DatavizMetric, DatavizAggregation[]> = {
  duration: ["sum", "min", "max", "avg", "evolution"],
  watches: ["count", "distinctCount", "min", "max", "avg", "evolution"],
  titles: ["count", "distinctCount", "min", "max", "avg", "evolution"],
  note: ["count", "distinctCount", "min", "max", "avg", "evolution"],
};

/**
 * Pour `watches`/`titles`, choisir min/max/avg/evolution ne conserve que
 * les groupements `none`/`period` (cf. `DatavizQueryDto` côté backend).
 */
export function isGroupByRestricted(metric: DatavizMetric, aggregation: DatavizAggregation): boolean {
  return (
    (metric === "watches" || metric === "titles") &&
    (["min", "max", "avg", "evolution"] as DatavizAggregation[]).includes(aggregation)
  );
}

/**
 * L'axe "Légende" (2ème groupement, cf. `legendBy`) n'est supporté que par
 * le chemin backend "standard" (count/distinctCount/sum/min/max) — pas par
 * evolution, note+avg, ni watches/titres restreint (cf.
 * `DatavizService.queryRows`, `rowsStandard`/`rowsStudioStandard` seuls à
 * accepter `legendBy`).
 */
export function supportsLegend(metric: DatavizMetric, aggregation: DatavizAggregation): boolean {
  if (isGroupByRestricted(metric, aggregation)) return false;
  if (aggregation === "evolution") return false;
  if (metric === "note" && aggregation === "avg") return false;
  return true;
}

export type DatavizPeriodMode = "fixed" | "aggregated";
export type DatavizFixedGranularity = "day" | "month" | "quarter" | "year";
export type DatavizAggregatedGranularity = "hour" | "dayQuarter" | "weekday" | "monthOfYear" | "season";
export type DatavizGranularity = DatavizFixedGranularity | DatavizAggregatedGranularity;

/**
 * Filtres "type header" (genre/pays/studio/année de sortie/note IMDB/
 * listes) — intégrés au menu "⋮" de chaque visuel (le header ne s'affiche
 * plus sur la page Profil), plus le filtre "Type de média" et "Année de
 * visionnage" propres au module dataviz.
 */
export type DatavizExtraFilters = {
  mediaType: DatavizMediaType | null;
  watchedYearMin: number | null;
  watchedYearMax: number | null;
  releaseYearMin: number | null;
  releaseYearMax: number | null;
  noteImdbMin: number | null;
  noteImdbMax: number | null;
  genreIds: string[];
  countryIds: string[];
  studioIds: string[];
  listIds: string[];
};

export const DEFAULT_EXTRA_FILTERS: DatavizExtraFilters = {
  mediaType: null,
  watchedYearMin: null,
  watchedYearMax: null,
  releaseYearMin: null,
  releaseYearMax: null,
  noteImdbMin: null,
  noteImdbMax: null,
  genreIds: [],
  countryIds: [],
  studioIds: [],
  listIds: [],
};

/** Configuration complète d'un visuel — identique pour les 8 widgets. */
export type DatavizVisualConfig = DatavizExtraFilters & {
  metric: DatavizMetric;
  aggregation: DatavizAggregation;
  groupBy: DatavizGroupBy;
  granularity: DatavizGranularity;
  /** Axe "Légende" (barcharts/linechart uniquement) — "none" = pas de légende. */
  legendBy: DatavizGroupBy;
};

export function defaultVisualConfig(
  metric: DatavizMetric,
  aggregation: DatavizAggregation,
  groupBy: DatavizGroupBy = "none",
): DatavizVisualConfig {
  return { metric, aggregation, groupBy, granularity: "month", legendBy: "none", ...DEFAULT_EXTRA_FILTERS };
}

/** Ligne brute renvoyée par `/dataviz/query`. */
export type DatavizRow = {
  category_id: string | null;
  category: string;
  series_id?: string | null;
  series?: string;
  value: number | null;
};
export type DatavizQueryResult = { total: number | null; rows: DatavizRow[] };

/** Donnée transformée pour les graphiques (Recharts) — une seule série. */
export type DatavizChartDatum = { category: string; value: number };

/** Donnée transformée pour les graphiques multi-séries (axe "Légende" actif). */
export type DatavizPivotedDatum = { category: string } & Record<string, string | number>;
