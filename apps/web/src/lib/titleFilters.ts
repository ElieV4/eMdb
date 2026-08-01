/**
 * Filtres de type/genre/pays/année/note partagés entre le header (contrôles)
 * et les pages qui les consomment (ex. filmographie, bug #28/#33/#34).
 * Portés par les paramètres de l'URL courante plutôt que par un store, pour
 * rester simples à partager entre le header et n'importe quelle page.
 */

export type TitleTypeFilter = "tout" | "film" | "serie";
export type WatchedStatusFilter = "tout" | "vu" | "non_vu";

export type TitleFilters = {
  type: TitleTypeFilter;
  genreIds: string[];
  countryIds: string[];
  yearMin: number | null;
  yearMax: number | null;
  noteImdbMin: number | null;
  noteImdbMax: number | null;
  listIds: string[];
  watchedStatus: WatchedStatusFilter;
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
  const watchedStatus = searchParams.get("vu");

  return {
    type: type === "film" || type === "serie" ? type : "tout",
    genreIds: searchParams.get("genres")?.split(",").filter(Boolean) ?? [],
    countryIds: searchParams.get("pays")?.split(",").filter(Boolean) ?? [],
    yearMin: yearMin ? Number(yearMin) : null,
    yearMax: yearMax ? Number(yearMax) : null,
    noteImdbMin: noteImdbMin ? Number(noteImdbMin) : null,
    noteImdbMax: noteImdbMax ? Number(noteImdbMax) : null,
    listIds: searchParams.get("listes")?.split(",").filter(Boolean) ?? [],
    watchedStatus: watchedStatus === "vu" || watchedStatus === "non_vu" ? watchedStatus : "tout",
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
    filters.noteImdbMax !== null ||
    filters.listIds.length > 0 ||
    filters.watchedStatus !== "tout"
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

/**
 * Forme minimale requise pour évaluer un titre contre les `TitleFilters` —
 * chaque page adapte sa propre forme de donnée (Title, ListItemFilterMeta,
 * TitleSearchResult, ...) vers celle-ci avant de filtrer (bug filtres header
 * sur accueil/watchlist/listes/historique).
 */
export type FilterableTitle = {
  id: string;
  type: "film" | "serie";
  year: number | null;
  note: number | null;
  genreIds: string[];
  countryIds: string[];
  /** Ids des listes utilisateur contenant ce titre (filtre "Listes"). */
  listIds: string[];
  /** Le titre a-t-il été marqué comme vu (filtre "vu / tout / non vu") ? */
  watched: boolean;
};

/** Ids de listes par titre, à partir de `useLists()` — pour le filtre "Listes". */
export function buildListIdsByTitle(
  lists: { id: string; items?: { titleId: string }[] }[] | undefined,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const list of lists ?? []) {
    for (const item of list.items ?? []) {
      const arr = map.get(item.titleId);
      if (arr) arr.push(list.id);
      else map.set(item.titleId, [list.id]);
    }
  }
  return map;
}

/** Adapte un `Title`/`TitleSearchResult` (genres/pays en objets) vers `FilterableTitle`. */
export function toFilterableTitle(
  title: {
    id: string;
    type: "film" | "serie";
    dateSortie?: string | null;
    note?: number | null;
    genres?: { id: string }[];
    pays?: { id: string }[];
  },
  context?: {
    watchedTitleIds?: Set<string>;
    listIdsByTitle?: Map<string, string[]>;
  },
): FilterableTitle {
  return {
    id: title.id,
    type: title.type,
    year: title.dateSortie ? new Date(title.dateSortie).getFullYear() : null,
    note: title.note ?? null,
    genreIds: title.genres?.map((g) => g.id) ?? [],
    countryIds: title.pays?.map((p) => p.id) ?? [],
    listIds: context?.listIdsByTitle?.get(title.id) ?? [],
    watched: context?.watchedTitleIds?.has(title.id) ?? false,
  };
}

export function titleMatchesFilters(
  title: FilterableTitle,
  filters: TitleFilters,
): boolean {
  if (filters.type !== "tout" && title.type !== filters.type) return false;

  if (
    filters.genreIds.length > 0 &&
    !filters.genreIds.some((id) => title.genreIds.includes(id))
  )
    return false;

  if (
    filters.countryIds.length > 0 &&
    !filters.countryIds.some((id) => title.countryIds.includes(id))
  )
    return false;

  if (
    filters.yearMin !== null &&
    (title.year === null || title.year < filters.yearMin)
  )
    return false;

  if (
    filters.yearMax !== null &&
    (title.year === null || title.year > filters.yearMax)
  )
    return false;

  if (
    filters.noteImdbMin !== null &&
    (title.note === null || title.note < filters.noteImdbMin)
  )
    return false;

  if (
    filters.noteImdbMax !== null &&
    (title.note === null || title.note > filters.noteImdbMax)
  )
    return false;

  if (
    filters.listIds.length > 0 &&
    !filters.listIds.some((id) => title.listIds.includes(id))
  )
    return false;

  if (filters.watchedStatus === "vu" && !title.watched) return false;
  if (filters.watchedStatus === "non_vu" && title.watched) return false;

  return true;
}
