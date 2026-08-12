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
  studioIds: string[];
  yearMin: number | null;
  yearMax: number | null;
  noteImdbMin: number | null;
  noteImdbMax: number | null;
  listIds: string[];
  watchedStatus: WatchedStatusFilter;
  /** Filtre "date de visionnage" (année) — n'a de sens que sur /history,
   * ne s'applique jamais aux titres eux-mêmes (cf. `titleMatchesFilters`). */
  watchedYearMin: number | null;
  watchedYearMax: number | null;
  /** "Apprécié en France" — n'a de sens que sur Découvrir et Titres
   * recommandés (envoyé au backend comme paramètre de requête, pas évalué
   * localement par `titleMatchesFilters` : ces deux pages consomment des
   * données TMDB brutes/agrégées, pas les `pays` locaux des autres pages). */
  appreciesFr: boolean;
};

export const YEAR_RANGE_MIN = 1900;
export const YEAR_RANGE_MAX = new Date().getFullYear() + 2;
/** Borne basse du slider "Année de visionnage" (distincte de YEAR_RANGE_MIN,
 * qui reste 1900 pour "Année de sortie" — un titre peut être ancien même si
 * on ne le regarde jamais avant 2020, retour utilisateur). */
export const WATCHED_YEAR_RANGE_MIN = 2020;
export const NOTE_IMDB_MIN = 0;
export const NOTE_IMDB_MAX = 10;

export function parseTitleFilters(searchParams: URLSearchParams): TitleFilters {
  const type = searchParams.get("type");
  const yearMin = searchParams.get("yearMin");
  const yearMax = searchParams.get("yearMax");
  const noteImdbMin = searchParams.get("noteImdbMin");
  const noteImdbMax = searchParams.get("noteImdbMax");
  const watchedStatus = searchParams.get("vu");
  const watchedYearMin = searchParams.get("vuAnneeMin");
  const watchedYearMax = searchParams.get("vuAnneeMax");

  return {
    type: type === "film" || type === "serie" ? type : "tout",
    genreIds: searchParams.get("genres")?.split(",").filter(Boolean) ?? [],
    countryIds: searchParams.get("pays")?.split(",").filter(Boolean) ?? [],
    studioIds: searchParams.get("studios")?.split(",").filter(Boolean) ?? [],
    yearMin: yearMin ? Number(yearMin) : null,
    yearMax: yearMax ? Number(yearMax) : null,
    noteImdbMin: noteImdbMin ? Number(noteImdbMin) : null,
    noteImdbMax: noteImdbMax ? Number(noteImdbMax) : null,
    listIds: searchParams.get("listes")?.split(",").filter(Boolean) ?? [],
    watchedStatus: watchedStatus === "vu" || watchedStatus === "non_vu" ? watchedStatus : "tout",
    watchedYearMin: watchedYearMin ? Number(watchedYearMin) : null,
    watchedYearMax: watchedYearMax ? Number(watchedYearMax) : null,
    appreciesFr: searchParams.get("fr") === "1",
  };
}

export function hasActiveTitleFilters(filters: TitleFilters) {
  return (
    filters.type !== "tout" ||
    filters.genreIds.length > 0 ||
    filters.countryIds.length > 0 ||
    filters.studioIds.length > 0 ||
    filters.yearMin !== null ||
    filters.yearMax !== null ||
    filters.noteImdbMin !== null ||
    filters.noteImdbMax !== null ||
    filters.listIds.length > 0 ||
    filters.watchedStatus !== "tout" ||
    filters.watchedYearMin !== null ||
    filters.watchedYearMax !== null ||
    filters.appreciesFr
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
 *
 * `year`/`note`/`genreIds`/`countryIds` acceptent `undefined` — distinct de
 * `null`/`[]` — pour les surfaces qui ne peuvent tout simplement pas
 * calculer cette donnée (modification O : modules "Découvrir", qui
 * consomment directement les réponses TMDB trending/discover, lesquelles ne
 * portent ni les ids de genre/pays locaux ni, pour "Titres recommandés",
 * l'année de sortie). `undefined` signifie "non applicable ici, ne pas
 * filtrer dessus" ; `null`/`[]` reste "calculé, et effectivement vide/inconnu"
 * (continue d'exclure un titre sur un filtre actif, comportement inchangé
 * pour tous les appelants existants qui calculent toujours une vraie valeur).
 */
export type FilterableTitle = {
  id: string;
  type: "film" | "serie";
  year: number | null | undefined;
  note: number | null | undefined;
  genreIds: string[] | undefined;
  countryIds: string[] | undefined;
  /** Ids des studios de production (filtre "Studio", modification P) —
   * absent/`undefined` sur les surfaces qui ne portent pas cette donnée
   * (ex. résultats /search pas encore importés localement). */
  studioIds?: string[];
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
    studioIds?: string[];
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
    studioIds: title.studioIds,
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
    title.genreIds !== undefined &&
    !filters.genreIds.some((id) => title.genreIds!.includes(id))
  )
    return false;

  if (
    filters.countryIds.length > 0 &&
    title.countryIds !== undefined &&
    !filters.countryIds.some((id) => title.countryIds!.includes(id))
  )
    return false;

  if (
    filters.studioIds.length > 0 &&
    title.studioIds !== undefined &&
    !filters.studioIds.some((id) => title.studioIds!.includes(id))
  )
    return false;

  if (
    filters.yearMin !== null &&
    title.year !== undefined &&
    (title.year === null || title.year < filters.yearMin)
  )
    return false;

  if (
    filters.yearMax !== null &&
    title.year !== undefined &&
    (title.year === null || title.year > filters.yearMax)
  )
    return false;

  if (
    filters.noteImdbMin !== null &&
    title.note !== undefined &&
    (title.note === null || title.note < filters.noteImdbMin)
  )
    return false;

  if (
    filters.noteImdbMax !== null &&
    title.note !== undefined &&
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
