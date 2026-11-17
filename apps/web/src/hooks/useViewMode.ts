/**
 * Mode d'affichage d'une page de titres : "affiches" (grille de cartes) ou
 * "tableau". Mémorisé par page dans le navigateur (préférence de confort,
 * sans importance si elle se perd).
 */

import { useCallback, useEffect, useState } from "react";

export type ViewMode = "affiches" | "tableau";

const storageKey = (pageKey: string) => `emdb.viewMode.${pageKey}`;

export function useViewMode(pageKey: string, initial: ViewMode = "affiches") {
  const [mode, setModeState] = useState<ViewMode>(initial);

  // Lecture après le montage : localStorage n'existe pas au rendu serveur.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey(pageKey));
      if (saved === "affiches" || saved === "tableau") setModeState(saved);
    } catch {
      // Stockage indisponible (navigation privée...) : on garde le défaut.
    }
  }, [pageKey]);

  const setMode = useCallback(
    (next: ViewMode) => {
      setModeState(next);
      try {
        window.localStorage.setItem(storageKey(pageKey), next);
      } catch {
        // idem
      }
    },
    [pageKey],
  );

  return [mode, setMode] as const;
}
