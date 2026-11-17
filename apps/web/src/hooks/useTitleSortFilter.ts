/**
 * Tri et filtres de la vue affiches (panneau « Trier / filtrer ») : mêmes
 * colonnes et mêmes filtres que la vue tableau (genres, pays, sortie,
 * durée, notes, émotions...), appliqués aux cartes de la page.
 *
 * Les données complémentaires (genres, pays, ma note...) ne sont chargées
 * qu'une fois le panneau ouvert ou un tri / filtre actif.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { useTitlesTableInfo } from "@/hooks/api/useTitlesTableInfo";
import { useTitleEmotions } from "@/hooks/api/useTitleEmotions";
import {
  BASE_COLUMNS,
  ColumnFilterDef,
  SortState,
  TitleFilters,
  TitleRow,
  applyFilters,
  baseFilterDef,
  sortRows,
} from "@/lib/titlesTable";
import { FilterValue } from "@/lib/columnFilters";
import { TitleSearchResult } from "@/lib/types/api";

/** Colonnes proposées dans le panneau de la vue affiches. */
const PANEL_COLUMNS = BASE_COLUMNS.filter(
  (c) => c.id !== "affiche" && c.id !== "statut",
);

export const PANEL_FILTER_DEFS: ColumnFilterDef[] = PANEL_COLUMNS.map(
  baseFilterDef,
)
  // La recherche de la barre d'outils couvre déjà titre et réalisation.
  .filter((d): d is ColumnFilterDef => d !== null && d.kind !== "text");

export const PANEL_SORT_OPTIONS = PANEL_COLUMNS.filter((c) => c.sortValue).map(
  (c) => ({
    id: c.id as string,
    label: c.label,
  }),
);

export function useTitleSortFilter(
  titles: TitleSearchResult[],
  panelOpen: boolean,
) {
  const [sort, setSort] = useState<SortState>(null);
  const [filters, setFilters] = useState<TitleFilters>({});
  const activeCount = Object.keys(filters).length + (sort ? 1 : 0);
  const enabled = panelOpen || activeCount > 0;

  const { data: infoById } = useTitlesTableInfo(
    titles.filter((t) => t.local).map((t) => t.id),
    enabled,
  );
  const { data: emotionsById } = useTitleEmotions();

  const rows: TitleRow[] = useMemo(
    () =>
      titles.map((title) => ({
        title,
        info: infoById?.[title.id] ?? undefined,
        emotions: title.local ? emotionsById?.[title.id] : undefined,
      })),
    [titles, infoById, emotionsById],
  );

  const orderedIds = useMemo(() => {
    if (activeCount === 0) return null;
    const valueOf = (column: string, row: TitleRow) =>
      BASE_COLUMNS.find((c) => c.id === column)?.sortValue?.(row) ?? null;
    return sortRows(
      applyFilters(rows, filters, PANEL_FILTER_DEFS),
      sort,
      valueOf,
    ).map((r) => r.title.id);
  }, [rows, filters, sort, activeCount]);

  const setFilter = useCallback((id: string, value: FilterValue | null) => {
    setFilters((current) => {
      const next = { ...current };
      if (value) next[id] = value;
      else delete next[id];
      return next;
    });
  }, []);

  /** Éléments de la page, filtrés et réordonnés ; inchangés sans tri ni filtre. */
  const apply = useCallback(
    <T>(items: T[], idOf: (item: T) => string): T[] => {
      if (!orderedIds) return items;
      const byId = new Map(items.map((item) => [idOf(item), item]));
      return orderedIds
        .map((id) => byId.get(id))
        .filter((item): item is T => item !== undefined);
    },
    [orderedIds],
  );

  return {
    rows,
    sort,
    setSort,
    filters,
    setFilter,
    activeCount,
    reset: () => {
      setSort(null);
      setFilters({});
    },
    apply,
  };
}

export type TitleSortFilterState = ReturnType<typeof useTitleSortFilter>;
