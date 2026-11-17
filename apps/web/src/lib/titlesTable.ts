/**
 * Logique pure de la vue tableau générique des pages de titres (listes,
 * watchlist, recommandés, modules Découvrir...) : colonnes et tri.
 */

import type { ReactNode } from "react";
import { TitleSearchResult } from "@/lib/types/api";

export type TitleRowFlags = {
  watched?: boolean;
  inWatchlist?: boolean;
  inFavorites?: boolean;
};

/** Colonne propre à une page (ex. prochain épisode, vu dans la liste). */
export type ExtraColumn = {
  id: string;
  label: string;
  render: (title: TitleSearchResult) => ReactNode;
  /** Valeur de tri ; sans elle, la colonne n'est pas triable. */
  sortValue?: (title: TitleSearchResult) => string | number | null;
};

export type BaseColumnId = "titre" | "type" | "annee" | "duree" | "note";

export type SortState = { column: string; direction: "asc" | "desc" } | null;

export function releaseYear(title: TitleSearchResult): number | null {
  if (!title.dateSortie) return null;
  const year = new Date(title.dateSortie).getFullYear();
  return Number.isNaN(year) ? null : year;
}

/** Durée (film, en minutes) ou nombre d'épisodes (série). */
export function lengthValue(title: TitleSearchResult): number | null {
  return title.type === "film" ? title.duree ?? null : title.nombreEpisodes ?? null;
}

export const BASE_COLUMNS: {
  id: BaseColumnId;
  label: string;
  sortValue: (t: TitleSearchResult) => string | number | null;
}[] = [
  { id: "titre", label: "Titre", sortValue: (t) => t.titre.toLocaleLowerCase("fr") },
  { id: "type", label: "Type", sortValue: (t) => t.type },
  { id: "annee", label: "Année", sortValue: releaseYear },
  { id: "duree", label: "Durée / épisodes", sortValue: lengthValue },
  { id: "note", label: "Note IMDb", sortValue: (t) => (t.note != null ? Number(t.note) : null) },
];

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
export function sortTitles(
  titles: TitleSearchResult[],
  sort: SortState,
  valueOf: (column: string, title: TitleSearchResult) => string | number | null,
): TitleSearchResult[] {
  if (!sort) return titles;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...titles].sort((a, b) => {
    const va = valueOf(sort.column, a);
    const vb = valueOf(sort.column, b);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
    return String(va).localeCompare(String(vb), "fr") * factor;
  });
}
