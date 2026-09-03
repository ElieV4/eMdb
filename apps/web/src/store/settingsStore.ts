/**
 * Préférences d'affichage persistées (localStorage) : taille de police et
 * taille des affiches, appliquées globalement via des attributs sur <html>
 * (cf. app/layout.tsx) et consommées en CSS (styles/globals.css).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SizePreference = "petit" | "moyen" | "grand";

/** Quand proposer le popup "contexte de visionnage" à la création d'un
 * visionnage (marquer comme vu) : "aucun" | "film" | "episode" | "les_deux". */
export type WatchContextPopupMode = "aucun" | "film" | "episode" | "les_deux";

type SettingsState = {
  fontSize: SizePreference;
  posterSize: SizePreference;
  watchContextPopup: WatchContextPopupMode;
  setFontSize: (size: SizePreference) => void;
  setPosterSize: (size: SizePreference) => void;
  setWatchContextPopup: (mode: WatchContextPopupMode) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: "moyen",
      posterSize: "moyen",
      watchContextPopup: "film",
      setFontSize: (fontSize) => set({ fontSize }),
      setPosterSize: (posterSize) => set({ posterSize }),
      setWatchContextPopup: (watchContextPopup) => set({ watchContextPopup }),
    }),
    { name: "emdb-settings" },
  ),
);
