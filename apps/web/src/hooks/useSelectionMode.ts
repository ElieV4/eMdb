/**
 * Mode sélection multiple pour les sous-pages "Modifier le contenu"
 * (Continuer à regarder / Watchlist / Historique). Gère l'activation du
 * mode et l'ensemble des ids sélectionnés — la clé d'id est choisie par
 * l'appelant (title_id pour Watchlist/Continuer à regarder, watch.id pour
 * Historique où plusieurs visionnages peuvent partager un même titre).
 */

import { useState } from "react";

export function useSelectionMode() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return {
    selectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelected,
    clearSelection,
  };
}
