/**
 * État commun des pages qui listent des titres : recherche, vue (affiches /
 * tableau, mémorisée par page), panneaux « Trier / filtrer » et
 * « Colonnes », mode « Modifier le contenu » (action choisie + sélection).
 *
 * En mode « Modifier le contenu », la vue choisie est conservée : cases sur
 * les cartes en affiches, colonne de cases à gauche en tableau. Seul
 * « Réordonner » (glisser-déposer) repasse en affiches.
 */

import { useCallback, useState } from "react";
import { useViewMode } from "@/hooks/useViewMode";
import { BulkActionId } from "@/lib/bulkEdit";

export function useTitlesPage(pageKey: string) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useViewMode(pageKey);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<BulkActionId | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectAll = useCallback(
    (ids: string[]) => setSelectedIds(new Set(ids)),
    [],
  );
  /** Coche ou décoche un ensemble d'éléments (case « tout » du tableau). */
  const setAllSelected = useCallback((ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const toggleEditing = useCallback(() => {
    setEditing((e) => !e);
    setAction(null);
    setSelectedIds(new Set());
  }, []);
  const stopEditing = useCallback(() => {
    setEditing(false);
    setAction(null);
    setSelectedIds(new Set());
  }, []);

  const effectiveView = editing && action === "reorder" ? "affiches" : viewMode;
  const selecting = editing && action !== null && action !== "reorder";

  return {
    search,
    setSearch,
    viewMode: effectiveView,
    setViewMode,
    isTable: effectiveView === "tableau",
    filtersOpen,
    toggleFilters: () => setFiltersOpen((o) => !o),
    columnsOpen,
    toggleColumns: () => setColumnsOpen((o) => !o),
    editing,
    toggleEditing,
    stopEditing,
    action,
    setAction,
    /** Cases de sélection visibles sur les cartes. */
    selecting,
    selectedIds,
    toggleSelected,
    clearSelection,
    selectAll,
    setAllSelected,
    /** Props de sélection du tableau (TitlesTable) quand des cases sont affichées. */
    tableSelection: selecting
      ? { selectedIds, onToggle: toggleSelected, onSetAll: setAllSelected }
      : undefined,
  };
}
