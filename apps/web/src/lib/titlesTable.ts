/**
 * Logique pure de la vue tableau générique des pages de titres (listes,
 * watchlist, recommandés, modules Découvrir...) : colonnes, recherche,
 * filtres et tri.
 */

import type { ReactNode } from "react";
import { TitleSearchResult } from "@/lib/types/api";

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
};

/** Ligne du tableau : le titre et ses données complémentaires. */
export type TitleRow = { title: TitleSearchResult; info?: TitleExtraInfo };

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
  | "statut";

export type BaseColumn = {
  id: BaseColumnId;
  label: string;
  /** Valeur de tri (null = toujours en fin). */
  sortValue: ((row: TitleRow) => string | number | null) | null;
  /** Texte cherché par la recherche globale et le filtre texte. */
  text: (row: TitleRow) => string;
  filter: "text" | "number" | null;
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
    ? title.duree ?? info?.duree ?? null
    : title.nombreEpisodes ?? info?.nombreEpisodes ?? null;
}

const directors = (row: TitleRow) => (row.info?.realisateurs ?? []).map((d) => d.nom).join(", ");

export const BASE_COLUMNS: BaseColumn[] = [
  { id: "affiche", label: "Affiche", sortValue: null, text: () => "", filter: null, defaultVisible: true },
  {
    id: "titre",
    label: "Titre",
    sortValue: (r) => r.title.titre.toLocaleLowerCase("fr"),
    text: (r) => [r.title.titre, r.title.titreOriginal].filter(Boolean).join(" "),
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
    filter: "number",
    defaultVisible: true,
  },
  {
    id: "duree",
    label: "Durée / épisodes",
    sortValue: lengthValue,
    text: (r) => String(lengthValue(r) ?? ""),
    filter: "number",
    defaultVisible: true,
  },
  {
    id: "notePerso",
    label: "Ma note",
    sortValue: (r) => r.info?.notePerso ?? null,
    text: (r) => (r.info?.notePerso != null ? String(r.info.notePerso) : ""),
    filter: "number",
    defaultVisible: true,
  },
  {
    id: "type",
    label: "Type",
    sortValue: (r) => r.title.type,
    text: (r) => (r.title.type === "film" ? "Film" : "Série"),
    filter: "text",
    defaultVisible: false,
  },
  {
    id: "noteImdb",
    label: "Note IMDb",
    sortValue: (r) => (r.title.note != null ? Number(r.title.note) : null),
    text: (r) => (r.title.note != null ? String(r.title.note) : ""),
    filter: "number",
    defaultVisible: false,
  },
  { id: "statut", label: "Statut", sortValue: null, text: () => "", filter: null, defaultVisible: false },
];

export const normalize = (s: string) =>
  s.toLocaleLowerCase("fr").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Recherche globale : titre, titre original, réalisation, année, genres, colonnes de la page. */
export function rowMatchesSearch(row: TitleRow, query: string, extraText = ""): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = [
    ...BASE_COLUMNS.map((c) => c.text(row)),
    ...(row.title.genres ?? []).map((g) => g.nom),
    extraText,
  ].join(" ");
  return normalize(haystack).includes(q);
}

/**
 * Filtre d'une colonne : texte contenu (sans casse ni accents) ou minimum
 * pour une colonne numérique. Valeur vide = pas de filtre.
 */
export function matchesColumnFilter(
  value: string | number | null,
  text: string,
  kind: "text" | "number",
  filter: string,
): boolean {
  const f = filter.trim();
  if (!f) return true;
  if (kind === "number") {
    const min = Number(f.replace(",", "."));
    if (Number.isNaN(min)) return true;
    return typeof value === "number" && value >= min;
  }
  return normalize(text).includes(normalize(f));
}

/** Cycle du tri au clic sur un en-tête : croissant → décroissant → aucun. */
export function nextSort(current: SortState, column: string): SortState {
  if (!current || current.column !== column) return { column, direction: "asc" };
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
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
    return String(va).localeCompare(String(vb), "fr") * factor;
  });
}
