/**
 * Transformateurs de données Dataviz — modification W, menu unifié (8ème
 * passe). Convertit les lignes brutes de `/dataviz/query` vers le format
 * Recharts, et fournit les libellés dynamiques (titre/valeur) dérivés de
 * la config métrique/agrégation/groupement.
 */

import {
  DatavizAggregation,
  DatavizChartDatum,
  DatavizGranularity,
  DatavizGroupBy,
  DatavizMetric,
  DatavizPivotedDatum,
  DatavizRow,
  DatavizVisualConfig,
} from "./types";

const AGGREGATED_GRANULARITIES = new Set(["hour", "dayQuarter", "weekday", "monthOfYear", "season"]);

// Ordinal → label, pour les granularités "Agrégées" (backend renvoie un
// petit entier, pas une date — cf. `DatavizAggregatedGranularity`).
const DAY_QUARTER_LABELS = ["", "Matin", "Après-midi", "Soirée", "Nuit"];
const WEEKDAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MONTH_LABELS = [
  "",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const SEASON_LABELS = ["", "Hiver", "Printemps", "Été", "Automne"];

/** Formate une catégorie "Période" (date pour Fixe, entier ordinal pour Agrégée) en label lisible. */
export function formatPeriodLabel(raw: string, granularity: DatavizGranularity): string {
  if (AGGREGATED_GRANULARITIES.has(granularity)) {
    const ordinal = Number(raw);
    switch (granularity) {
      case "hour":
        return `${ordinal}h`;
      case "dayQuarter":
        return DAY_QUARTER_LABELS[ordinal] ?? raw;
      case "weekday":
        return WEEKDAY_LABELS[ordinal] ?? raw;
      case "monthOfYear":
        return MONTH_LABELS[ordinal] ?? raw;
      case "season":
        return SEASON_LABELS[ordinal] ?? raw;
      default:
        return raw;
    }
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  switch (granularity) {
    case "day":
      return date.toLocaleDateString("fr-FR");
    case "quarter":
      return `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    case "year":
      return String(date.getFullYear());
    case "month":
    default:
      return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
}

export function transformRows(rows: DatavizRow[], groupBy: DatavizGroupBy, granularity: DatavizGranularity): DatavizChartDatum[] {
  return rows.map((row) => ({
    category: groupBy === "period" ? formatPeriodLabel(row.category, granularity) : row.category,
    value: Number(row.value) || 0,
  }));
}

/**
 * Pivote les lignes `{category, series, value}` (axe "Légende" actif) vers
 * le format "large" attendu par Recharts (`[{category, "Série A": 10,
 * "Série B": 5}, ...]`) — une clé par série distincte, une ligne par
 * catégorie. Sans légende (`series` absent de toutes les lignes), retombe
 * sur une unique série `"value"` (comportement identique à `transformRows`).
 * `granularity` s'applique aux deux axes s'ils valent "period" (même
 * valeur de granularité pour le groupement et la légende, cf. le menu qui
 * n'expose qu'un seul sélecteur de granularité).
 */
export function pivotRowsByLegend(
  rows: DatavizRow[],
  groupBy: DatavizGroupBy,
  legendBy: DatavizGroupBy,
  granularity: DatavizGranularity,
): { data: DatavizPivotedDatum[]; seriesKeys: string[] } {
  const hasLegend = rows.some((r) => r.series !== undefined && r.series !== null);
  if (!hasLegend) {
    const data = transformRows(rows, groupBy, granularity).map((d) => ({ category: d.category, value: d.value }));
    return { data, seriesKeys: ["value"] };
  }

  const categoryOrder: string[] = [];
  const seriesOrder: string[] = [];
  const map = new Map<string, DatavizPivotedDatum>();

  for (const row of rows) {
    const categoryLabel = groupBy === "period" ? formatPeriodLabel(row.category, granularity) : row.category;
    const seriesLabel = legendBy === "period" && row.series ? formatPeriodLabel(row.series, granularity) : (row.series ?? "—");

    if (!seriesOrder.includes(seriesLabel)) seriesOrder.push(seriesLabel);
    if (!map.has(categoryLabel)) {
      map.set(categoryLabel, { category: categoryLabel });
      categoryOrder.push(categoryLabel);
    }
    map.get(categoryLabel)![seriesLabel] = Number(row.value) || 0;
  }

  return { data: categoryOrder.map((c) => map.get(c)!), seriesKeys: seriesOrder };
}

/**
 * Formate uniquement le libellé de catégorie, en préservant `value` tel
 * quel (y compris `null`) — contrairement à `transformRows`, qui coerce
 * `null` en `0` (adapté aux graphiques, qui ont besoin d'un nombre pour
 * tracer une barre/un point, mais pas aux cartes : `null` a un sens propre
 * pour `evolution` — "pas de période précédente à comparer" — que
 * `formatDatavizValue` distingue explicitement de `0`, "aucune évolution").
 */
export function labelRows(rows: DatavizRow[], groupBy: DatavizGroupBy, granularity: DatavizGranularity): DatavizRow[] {
  return rows.map((row) => ({
    ...row,
    category: groupBy === "period" ? formatPeriodLabel(row.category, granularity) : row.category,
  }));
}

/** Formate un total de minutes en "Xh Ymin" (ou juste l'un des deux si l'autre est à 0). */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

/**
 * Formate une durée (en minutes) à l'échelle la plus lisible. Approximation
 * volontaire (mois = 30 jours, année = 365 jours) : l'objectif est la
 * lisibilité ("3 mois et 6 jours"), pas une décomposition calendaire exacte.
 *
 * Exemples : "1h30", "1 jour et 14h", "3 mois et 6 jours", "1 an et 2 mois".
 */
export function formatFriendlyDuration(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)}min`;
  }

  const totalHours = totalMinutes / 60;
  if (totalHours < 24) {
    const h = Math.floor(totalHours);
    const m = Math.round(totalMinutes - h * 60);
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  }

  const totalDays = totalHours / 24;
  if (totalDays < 60) {
    const d = Math.floor(totalDays);
    const h = Math.floor(totalHours - d * 24);
    return h > 0 ? `${d} jour${d > 1 ? "s" : ""} et ${h}h` : `${d} jour${d > 1 ? "s" : ""}`;
  }

  const totalMonths = totalDays / 30;
  if (totalMonths < 12) {
    const mo = Math.floor(totalMonths);
    const d = Math.floor(totalDays - mo * 30);
    return d > 0 ? `${mo} mois et ${d} jour${d > 1 ? "s" : ""}` : `${mo} mois`;
  }

  const years = Math.floor(totalDays / 365);
  const remMonths = Math.floor((totalDays - years * 365) / 30);
  return remMonths > 0 ? `${years} an${years > 1 ? "s" : ""} et ${remMonths} mois` : `${years} an${years > 1 ? "s" : ""}`;
}

// ============================================
// Libellés dynamiques
// ============================================

export const METRIC_LABEL: Record<DatavizMetric, string> = {
  duration: "Durée",
  watches: "Visionnages",
  titles: "Titres",
  note: "Note",
};

export const AGGREGATION_LABEL: Record<DatavizAggregation, string> = {
  sum: "Somme",
  count: "Nombre",
  distinctCount: "Distincts",
  min: "Minimum",
  max: "Maximum",
  avg: "Moyenne",
  evolution: "Évolution",
};

const GROUP_BY_LABEL: Record<Exclude<DatavizGroupBy, "none" | "period">, string> = {
  mediaType: "par type de média",
  genre: "par genre",
  country: "par pays",
  studio: "par studio",
  title: "par titre",
  actor: "par acteur",
  director: "par réalisateur",
};

const GRANULARITY_LABEL: Record<DatavizGranularity, string> = {
  day: "par jour",
  month: "par mois",
  quarter: "par trimestre",
  year: "par année",
  hour: "par heure",
  dayQuarter: "par quart de journée",
  weekday: "par jour de la semaine",
  monthOfYear: "par mois de l'année",
  season: "par saison",
};

/** Titre dynamique d'un visuel — ex. "Somme — Durée par genre". */
export function describeVisualConfig(config: Pick<DatavizVisualConfig, "metric" | "aggregation" | "groupBy" | "granularity">): string {
  const groupLabel =
    config.groupBy === "none"
      ? ""
      : config.groupBy === "period"
        ? ` ${GRANULARITY_LABEL[config.granularity]}`
        : ` ${GROUP_BY_LABEL[config.groupBy]}`;
  return `${AGGREGATION_LABEL[config.aggregation]} — ${METRIC_LABEL[config.metric]}${groupLabel}`;
}

/** Unité affichée après une valeur, selon métrique + agrégation. */
export function unitForMetric(metric: DatavizMetric, aggregation: DatavizAggregation): string {
  if (aggregation === "evolution") return "";
  switch (metric) {
    case "duration":
      return "min";
    case "watches":
      return "visionnage(s)";
    case "titles":
      return "titre(s)";
    case "note":
      return aggregation === "count" || aggregation === "distinctCount" ? "titre(s) noté(s)" : "/10";
  }
}

/** Formate une valeur pour l'affichage, selon métrique + agrégation. */
export function formatDatavizValue(metric: DatavizMetric, aggregation: DatavizAggregation, value: number | null): string {
  if (value === null) return "—";
  if (aggregation === "evolution") {
    return `${value >= 0 ? "+" : ""}${value.toLocaleString("fr-FR")}%`;
  }
  if (metric === "duration") {
    return `${formatFriendlyDuration(value)} (${Math.round(value).toLocaleString("fr-FR")} min)`;
  }
  if (metric === "note") {
    if (aggregation === "count" || aggregation === "distinctCount") {
      return `${Math.round(value).toLocaleString("fr-FR")} titre(s) noté(s)`;
    }
    return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/10`;
  }
  const unit = unitForMetric(metric, aggregation);
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return `${rounded.toLocaleString("fr-FR")} ${unit}`;
}
