/**
 * Logique pure de la vue tableau générique des pages de titres (listes,
 * watchlist, recommandés, modules Découvrir...) : colonnes, recherche,
 * filtres et tri.
 */

import type { ReactNode } from "react";
import { TitleSearchResult } from "@/lib/types/api";
import { emotionLabels, emotionOption } from "@/lib/watchContext";
import {
  FilterAccessors,
  FilterKind,
  FilterOption,
  FilterValue,
  matchesFilter,
  rangeBounds,
  setOptions,
} from "@/lib/columnFilters";

export type TitleRowFlags = {
  watched?: boolean;
  inWatchlist?: boolean;
  inFavorites?: boolean;
};

/** Données complémentaires d'un titre (POST /titles/table-info). */
export type TitleExtraInfo = {
  realisateurs: { id: string; nom: string }[];
  notePerso: number | null;
  duree: number | null;
  nombreEpisodes: number | null;
  /** Titre français, s'il est connu (infobulle du titre). */
  titreVf?: string | null;
  genres?: string[];
  pays?: { code: string; nom: string }[];
};

/**
 * Ligne du tableau : le titre, ses données complémentaires et les émotions
 * de l'utilisateur pour ce titre.
 */
export type TitleRow = {
  title: TitleSearchResult;
  info?: TitleExtraInfo;
  emotions?: string[];
};

/** Colonne propre à une page (ex. prochain épisode, vu dans la liste). */
export type ExtraColumn = {
  id: string;
  label: string;
  render: (title: TitleSearchResult) => ReactNode;
  /** Valeur de tri et de filtre ; sans elle, la colonne n'est ni triable ni filtrable. */
  sortValue?: (title: TitleSearchResult) => string | number | null;
  /** Visible par défaut (défaut : oui). */
  defaultVisible?: boolean;
};

export type BaseColumnId =
  | "affiche"
  | "titre"
  | "realisation"
  | "sortie"
  | "duree"
  | "notePerso"
  | "type"
  | "noteImdb"
  | "statut"
  | "genres"
  | "pays"
  | "emotions";

export type BaseColumn = {
  id: BaseColumnId;
  label: string;
  /** Valeur de tri (null = toujours en fin). */
  sortValue: ((row: TitleRow) => string | number | null) | null;
  /** Texte cherché par la recherche globale et le filtre texte. */
  text: (row: TitleRow) => string;
  /**
   * Filtre de la colonne (entonnoir de l'en-tête) : barre de recherche,
   * curseur à deux bornes (`number`) ou liste de cases (`set`).
   */
  filter: FilterKind | null;
  /** Filtre « plage » : valeur numérique, pas du curseur, format. */
  number?: (row: TitleRow) => number | null;
  step?: number;
  format?: (n: number) => string;
  /** Filtre « liste » : valeurs de la ligne et libellé d'une valeur. */
  set?: (row: TitleRow) => string[];
  setLabel?: (value: string) => string;
  defaultVisible: boolean;
};

export type SortState = { column: string; direction: "asc" | "desc" } | null;

export function releaseYear(title: TitleSearchResult): number | null {
  if (!title.dateSortie) return null;
  const year = new Date(title.dateSortie).getFullYear();
  return Number.isNaN(year) ? null : year;
}

/** Durée (film, en minutes) ou nombre d'épisodes (série). */
export function lengthValue(row: TitleRow): number | null {
  const { title, info } = row;
  return title.type === "film"
    ? (title.duree ?? info?.duree ?? null)
    : (title.nombreEpisodes ?? info?.nombreEpisodes ?? null);
}

const directors = (row: TitleRow) =>
  (row.info?.realisateurs ?? []).map((d) => d.nom).join(", ");

export const genreNames = (row: TitleRow): string[] =>
  row.info?.genres ?? (row.title.genres ?? []).map((g) => g.nom);
export const countryNames = (row: TitleRow): string[] =>
  (row.info?.pays ?? row.title.pays ?? []).map((c) => c.nom);
const lowerOrNull = (s: string) => s.toLocaleLowerCase("fr") || null;

/** Titre français à afficher en infobulle, s'il diffère du titre affiché. */
export function frenchTitleHint(row: TitleRow): string | null {
  const vf = row.info?.titreVf?.trim();
  return vf && vf !== row.title.titre ? vf : null;
}

export const BASE_COLUMNS: BaseColumn[] = [
  {
    id: "affiche",
    label: "Affiche",
    sortValue: null,
    text: () => "",
    filter: null,
    defaultVisible: true,
  },
  {
    id: "titre",
    label: "Titre",
    sortValue: (r) => r.title.titre.toLocaleLowerCase("fr"),
    text: (r) =>
      [r.title.titre, r.title.titreOriginal, r.info?.titreVf]
        .filter(Boolean)
        .join(" "),
    filter: "text",
    defaultVisible: true,
  },
  {
    id: "realisation",
    label: "Réalisation",
    sortValue: (r) => directors(r).toLocaleLowerCase("fr") || null,
    text: directors,
    filter: "text",
    defaultVisible: true,
  },
  {
    id: "sortie",
    label: "Sortie",
    sortValue: (r) => releaseYear(r.title),
    text: (r) => String(releaseYear(r.title) ?? ""),
    filter: "range",
    number: (r) => releaseYear(r.title),
    defaultVisible: true,
  },
  {
    id: "duree",
    label: "Durée / épisodes",
    sortValue: lengthValue,
    text: (r) => String(lengthValue(r) ?? ""),
    filter: "range",
    number: lengthValue,
    defaultVisible: true,
  },
  {
    id: "notePerso",
    label: "Ma note",
    sortValue: (r) => r.info?.notePerso ?? null,
    text: (r) => (r.info?.notePerso != null ? String(r.info.notePerso) : ""),
    filter: "range",
    number: (r) => r.info?.notePerso ?? null,
    step: 0.5,
    defaultVisible: true,
  },
  {
    id: "type",
    label: "Type",
    sortValue: (r) => r.title.type,
    text: (r) => (r.title.type === "film" ? "Film" : "Série"),
    filter: "set",
    set: (r) => [r.title.type === "film" ? "Film" : "Série"],
    defaultVisible: false,
  },
  {
    id: "noteImdb",
    label: "Note IMDb",
    sortValue: (r) => (r.title.note != null ? Number(r.title.note) : null),
    text: (r) => (r.title.note != null ? String(r.title.note) : ""),
    filter: "range",
    number: (r) => (r.title.note != null ? Number(r.title.note) : null),
    step: 0.1,
    format: (n) => n.toFixed(1),
    defaultVisible: false,
  },
  {
    id: "statut",
    label: "Statut",
    sortValue: null,
    text: () => "",
    filter: null,
    defaultVisible: false,
  },
  {
    id: "genres",
    label: "Genres",
    sortValue: (r) => lowerOrNull(genreNames(r).join(", ")),
    text: (r) => genreNames(r).join(", "),
    filter: "set",
    set: genreNames,
    defaultVisible: false,
  },
  {
    id: "pays",
    label: "Pays",
    sortValue: (r) => lowerOrNull(countryNames(r).join(", ")),
    text: (r) => countryNames(r).join(", "),
    filter: "set",
    set: countryNames,
    defaultVisible: false,
  },
  {
    id: "emotions",
    label: "Émotions",
    sortValue: (r) => lowerOrNull(emotionLabels(r.emotions) ?? ""),
    text: (r) => emotionLabels(r.emotions) ?? "",
    filter: "set",
    set: (r) => r.emotions ?? [],
    setLabel: (v) => {
      const o = emotionOption(v);
      return o ? `${o.emoji} ${o.label}` : v;
    },
    defaultVisible: false,
  },
];

export const normalize = (s: string) =>
  s.toLocaleLowerCase("fr").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Recherche globale : titre, titre original, réalisation, année, genres, colonnes de la page. */
export function rowMatchesSearch(
  row: TitleRow,
  query: string,
  extraText = "",
): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = [...BASE_COLUMNS.map((c) => c.text(row)), extraText].join(
    " ",
  );
  return normalize(haystack).includes(q);
}

/** Filtres actifs du tableau, par identifiant de colonne. */
export type TitleFilters = Record<string, FilterValue>;

/** Description du filtre d'une colonne (commune ou propre à la page). */
export type ColumnFilterDef = {
  id: string;
  label: string;
  kind: FilterKind;
  accessors: FilterAccessors<TitleRow>;
  step?: number;
  format?: (n: number) => string;
  setLabel?: (value: string) => string;
};

export function baseFilterDef(c: BaseColumn): ColumnFilterDef | null {
  if (!c.filter) return null;
  return {
    id: c.id,
    label: c.label,
    kind: c.filter,
    accessors: { text: c.text, number: c.number, set: c.set },
    step: c.step,
    format: c.format,
    setLabel: c.setLabel,
  };
}

/** Colonnes propres à la page : filtre texte sur leur valeur de tri. */
export function extraFilterDef(c: ExtraColumn): ColumnFilterDef | null {
  if (!c.sortValue) return null;
  const value = c.sortValue;
  return {
    id: c.id,
    label: c.label,
    kind: "text",
    accessors: { text: (r) => String(value(r.title) ?? "") },
  };
}

/** Bornes (plage) ou valeurs proposées (liste) d'un filtre, d'après les lignes. */
export function filterChoices(
  def: ColumnFilterDef,
  rows: TitleRow[],
): { bounds?: [number, number] | null; options?: FilterOption[] } {
  if (def.kind === "range" && def.accessors.number) {
    return { bounds: rangeBounds(rows, def.accessors.number) };
  }
  if (def.kind === "set" && def.accessors.set) {
    return { options: setOptions(rows, def.accessors.set, def.setLabel) };
  }
  return {};
}

export function applyFilters(
  rows: TitleRow[],
  filters: TitleFilters,
  defs: ColumnFilterDef[],
): TitleRow[] {
  const active = Object.entries(filters)
    .map(([id, value]) => ({ value, def: defs.find((d) => d.id === id) }))
    .filter((f): f is { value: FilterValue; def: ColumnFilterDef } => !!f.def);
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every(({ value, def }) => matchesFilter(row, value, def.accessors)),
  );
}

/** Cycle du tri au clic sur un en-tête : croissant → décroissant → aucun. */
export function nextSort(current: SortState, column: string): SortState {
  if (!current || current.column !== column)
    return { column, direction: "asc" };
  if (current.direction === "asc") return { column, direction: "desc" };
  return null;
}

/**
 * Trie sans modifier l'entrée. Valeurs absentes toujours en fin, quel que
 * soit le sens ; sans tri, l'ordre d'origine (celui de la page) est gardé.
 */
export function sortRows<T>(
  rows: T[],
  sort: SortState,
  valueOf: (column: string, row: T) => string | number | null,
): T[] {
  if (!sort) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = valueOf(sort.column, a);
    const vb = valueOf(sort.column, b);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "number" && typeof vb === "number")
      return (va - vb) * factor;
    return String(va).localeCompare(String(vb), "fr") * factor;
  });
}
