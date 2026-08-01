/**
 * Types pour le module Dataviz (Phase 6).
 * Alignés sur les réponses des endpoints backend :
 * - GET /dataviz/watch-time?groupBy=genre|period|country|animation
 * - GET /dataviz/watch-count?groupBy=genre|period|country|animation
 *
 * Les vues matérialisées retournent des lignes en snake_case (Prisma $queryRawUnsafe).
 */

export type DatavizGroupBy = "genre" | "period" | "country" | "animation";

export type DatavizMetric = "watch-time" | "watch-count";

export type DatavizQuery = {
  groupBy: DatavizGroupBy;
  yearFrom?: number;
  yearTo?: number;
};

// ============================================
// Lignes brutes retournées par le backend
// ============================================

/** Ligne d'une vue matérialisée groupée par période (semaine). */
export type WatchTimeByPeriodRow = {
  user_id: string;
  periode_semaine: string; // ISO date (début de semaine)
  periode_mois: string;
  periode_annee: number;
  minutes: number;
};

export type WatchCountByPeriodRow = {
  user_id: string;
  periode_semaine: string;
  periode_mois: string;
  periode_annee: number;
  nb_items: number;
};

/** Ligne d'une vue matérialisée groupée par genre. */
export type WatchTimeByGenreRow = {
  user_id: string;
  genre_id: string;
  minutes: number;
};

export type WatchCountByGenreRow = {
  user_id: string;
  genre_id: string;
  nb_items: number;
};

/** Ligne d'une vue matérialisée groupée par pays. */
export type WatchTimeByCountryRow = {
  user_id: string;
  country_id: string;
  minutes: number;
};

export type WatchCountByCountryRow = {
  user_id: string;
  country_id: string;
  nb_items: number;
};

/** Ligne d'une vue matérialisée groupée par animation. */
export type WatchTimeByAnimationRow = {
  user_id: string;
  is_animation: boolean;
  minutes: number;
};

export type WatchCountByAnimationRow = {
  user_id: string;
  is_animation: boolean;
  nb_items: number;
};

// ============================================
// Formats transformés pour Recharts
// ============================================

/** Donnée transformée pour un graphique en ligne (period). */
export type PeriodChartDatum = {
  date: string; // Label lisible (ex: "2026-01-06")
  value: number; // minutes ou nb_items
};

/** Donnée transformée pour un graphique en barres (genre/pays). */
export type CategoryChartDatum = {
  name: string; // Nom du genre ou du pays
  value: number; // minutes ou nb_items
};

/** Donnée transformée pour un graphique en camembert (animation). */
export type AnimationChartDatum = {
  name: string; // "Animation" | "Live-action"
  value: number; // minutes ou nb_items
};

/** Résumé calculé à partir des données brutes. */
export type DatavizSummary = {
  total: number;
  count: number;
  minYear: number | null;
  maxYear: number | null;
};
