/**
 * Transformateurs de données Dataviz (Phase 6.3).
 *
 * Convertit les lignes brutes des vues matérialisées (snake_case, retournées
 * par `GET /dataviz/watch-time` et `GET /dataviz/watch-count`) vers le format
 * attendu par Recharts.
 */

import {
  WatchTimeByPeriodRow,
  WatchCountByPeriodRow,
  WatchTimeByGenreRow,
  WatchCountByGenreRow,
  WatchTimeByCountryRow,
  WatchCountByCountryRow,
  WatchTimeByAnimationRow,
  WatchCountByAnimationRow,
  PeriodChartDatum,
  CategoryChartDatum,
  AnimationChartDatum,
  DatavizSummary,
} from "./types";

// ============================================
// Watch Time — Period
// ============================================

export function transformWatchTimeByPeriod(
  data: WatchTimeByPeriodRow[],
): PeriodChartDatum[] {
  return data.map((row) => ({
    date: formatWeekLabel(row.periode_semaine),
    value: Number(row.minutes) || 0,
  }));
}

// ============================================
// Watch Time — Genre
// ============================================

export function transformWatchTimeByGenre(
  data: WatchTimeByGenreRow[],
  genres: { id: string; nom: string }[],
): CategoryChartDatum[] {
  const genreMap = new Map(genres.map((g) => [g.id, g.nom]));
  return data
    .map((row) => ({
      name: genreMap.get(row.genre_id) ?? "Inconnu",
      value: Number(row.minutes) || 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// ============================================
// Watch Time — Country
// ============================================

export function transformWatchTimeByCountry(
  data: WatchTimeByCountryRow[],
  countries: { id: string; nom: string }[],
): CategoryChartDatum[] {
  const countryMap = new Map(countries.map((c) => [c.id, c.nom]));
  return data
    .map((row) => ({
      name: countryMap.get(row.country_id) ?? "Inconnu",
      value: Number(row.minutes) || 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// ============================================
// Watch Time — Animation
// ============================================

export function transformWatchTimeByAnimation(
  data: WatchTimeByAnimationRow[],
): AnimationChartDatum[] {
  return data.map((row) => ({
    name: row.is_animation ? "Animation" : "Live-action",
    value: Number(row.minutes) || 0,
  }));
}

// ============================================
// Watch Count — Period
// ============================================

export function transformWatchCountByPeriod(
  data: WatchCountByPeriodRow[],
): PeriodChartDatum[] {
  return data.map((row) => ({
    date: formatWeekLabel(row.periode_semaine),
    value: Number(row.nb_items) || 0,
  }));
}

// ============================================
// Watch Count — Genre
// ============================================

export function transformWatchCountByGenre(
  data: WatchCountByGenreRow[],
  genres: { id: string; nom: string }[],
): CategoryChartDatum[] {
  const genreMap = new Map(genres.map((g) => [g.id, g.nom]));
  return data
    .map((row) => ({
      name: genreMap.get(row.genre_id) ?? "Inconnu",
      value: Number(row.nb_items) || 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// ============================================
// Watch Count — Country
// ============================================

export function transformWatchCountByCountry(
  data: WatchCountByCountryRow[],
  countries: { id: string; nom: string }[],
): CategoryChartDatum[] {
  const countryMap = new Map(countries.map((c) => [c.id, c.nom]));
  return data
    .map((row) => ({
      name: countryMap.get(row.country_id) ?? "Inconnu",
      value: Number(row.nb_items) || 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// ============================================
// Watch Count — Animation
// ============================================

export function transformWatchCountByAnimation(
  data: WatchCountByAnimationRow[],
): AnimationChartDatum[] {
  return data.map((row) => ({
    name: row.is_animation ? "Animation" : "Live-action",
    value: Number(row.nb_items) || 0,
  }));
}

// ============================================
// Résumé
// ============================================

/**
 * Calcule un résumé à partir des lignes brutes d'une vue matérialisée.
 * - total : somme de la métrique (minutes ou nb_items)
 * - count : nombre de lignes
 * - minYear / maxYear : bornes de la période couverte (pour les vues period)
 */
export function computeDatavizSummary(
  rows: Array<Record<string, unknown>>,
  valueKey: "minutes" | "nb_items",
): DatavizSummary {
  let total = 0;
  let minYear: number | null = null;
  let maxYear: number | null = null;

  for (const row of rows) {
    const value = Number(row[valueKey]) || 0;
    total += value;

    const year = Number(row.periode_annee);
    if (Number.isFinite(year) && year > 0) {
      if (minYear === null || year < minYear) minYear = year;
      if (maxYear === null || year > maxYear) maxYear = year;
    }
  }

  return {
    total,
    count: rows.length,
    minYear,
    maxYear,
  };
}

// ============================================
// Utilitaires
// ============================================

/**
 * Formate une date ISO (début de semaine) en label lisible : "2026-01-06".
 * Si la date est invalide, retourne la chaîne brute.
 */
function formatWeekLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toISOString().slice(0, 10);
}
