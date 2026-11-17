/**
 * Filtres par colonne des vues tableau (et du panneau « Trier / filtrer »
 * de la vue affiches) :
 * - texte : la valeur contient la saisie (sans casse ni accents) ;
 * - plage : nombre (année, durée, note, date en jours) entre deux bornes ;
 * - liste : au moins une des valeurs cochées (genres, pays, type...).
 */

export type FilterKind = "text" | "range" | "set";

export type FilterValue =
  | { kind: "text"; value: string }
  | { kind: "range"; min: number; max: number }
  | { kind: "set"; values: string[] };

export type FilterOption = { value: string; label: string; count: number };

export const normalizeText = (s: string) =>
  s.toLocaleLowerCase("fr").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Valeurs d'une ligne pour une colonne, selon le type de filtre. */
export type FilterAccessors<R> = {
  text?: (row: R) => string;
  number?: (row: R) => number | null;
  set?: (row: R) => string[];
};

export function matchesFilter<R>(
  row: R,
  filter: FilterValue,
  get: FilterAccessors<R>,
): boolean {
  if (filter.kind === "text") {
    const q = normalizeText(filter.value.trim());
    if (!q) return true;
    return normalizeText(get.text?.(row) ?? "").includes(q);
  }
  if (filter.kind === "range") {
    const v = get.number?.(row) ?? null;
    return v !== null && v >= filter.min && v <= filter.max;
  }
  if (filter.values.length === 0) return true;
  const values = get.set?.(row) ?? [];
  return filter.values.some((v) => values.includes(v));
}

/** Un filtre qui ne restreint rien (texte vide, liste vide) est retiré. */
export function isActiveFilter(
  filter: FilterValue | null | undefined,
  bounds?: [number, number] | null,
) {
  if (!filter) return false;
  if (filter.kind === "text") return filter.value.trim() !== "";
  if (filter.kind === "set") return filter.values.length > 0;
  return !bounds || filter.min > bounds[0] || filter.max < bounds[1];
}

/** Bornes [min, max] des valeurs numériques présentes, ou null. */
export function rangeBounds<R>(
  rows: R[],
  number: (row: R) => number | null,
): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const v = number(row);
    if (v === null || Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min === Infinity ? null : [min, max];
}

/** Valeurs proposées par un filtre liste, les plus fréquentes d'abord. */
export function setOptions<R>(
  rows: R[],
  set: (row: R) => string[],
  label: (value: string) => string = (v) => v,
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const v of new Set(set(row))) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
}

/** Jour (nombre de jours depuis 1970) d'une date ISO : valeur des plages de dates. */
export function dayNumber(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.floor(t / 86_400_000);
}

export function formatDay(day: number): string {
  return new Date(day * 86_400_000).toLocaleDateString("fr-FR");
}
