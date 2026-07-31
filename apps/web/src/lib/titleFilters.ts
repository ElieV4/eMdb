/**
 * Filtres de type/genre/pays/année/note partagés entre le header (contrôles)
 * et les pages qui les consomment (ex. filmographie, bug #28/#33/#34).
 * Portés par les paramètres de l'URL courante plutôt que par un store, pour
 * rester simples à partager entre le header et n'importe quelle page.
 */

export type TitleTypeFilter = "tout" | "film" | "serie";

export type TitleFilters = {
  type: TitleTypeFilter;
  genreIds: string[];
  countryIds: string[];
  yearMin: number | null;
  yearMax: number | null;
  noteImdbMin: number | null;
  noteImdbMax: number | null;
};

export const YEAR_RANGE_MIN = 1900;
export const YEAR_RANGE_MAX = new Date().getFullYear() + 2;
export const NOTE_IMDB_MIN = 0;
export const NOTE_IMDB_MAX = 10;

export function parseTitleFilters(searchParams: URLSearchParams): TitleFilters {
  const type = searchParams.get("type");
  const yearMin = searchParams.get("yearMin");
  const yearMax = searchParams.get("yearMax");
  const noteImdbMin = searchParams.get("noteImdbMin");
  const noteImdbMax = searchParams.get("noteImdbMax");

  return {
    type: type === "film" || type === "serie" ? type : "tout",
    genreIds: searchParams.get("genres")?.split(",").filter(Boolean) ?? [],
    countryIds: searchParams.get("pays")?.split(",").filter(Boolean) ?? [],
    yearMin: yearMin ? Number(yearMin) : null,
    yearMax: yearMax ? Number(yearMax) : null,
    noteImdbMin: noteImdbMin ? Number(noteImdbMin) : null,
    noteImdbMax: noteImdbMax ? Number(noteImdbMax) : null,
  };
}

export function hasActiveTitleFilters(filters: TitleFilters) {
  return (
    filters.type !== "tout" ||
    filters.genreIds.length > 0 ||
    filters.countryIds.length > 0 ||
    filters.yearMin !== null ||
    filters.yearMax !== null ||
    filters.noteImdbMin !== null ||
    filters.noteImdbMax !== null
  );
}

/**
 * Construit une nouvelle query string à partir de la courante, en appliquant
 * `updates` (une valeur `null` supprime le paramètre).
 */
export function buildFilterQueryString(
  current: URLSearchParams,
  updates: Record<string, string | null>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  return next.toString();
}
