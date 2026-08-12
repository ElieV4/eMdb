/**
 * Préférences d'affichage persistées (localStorage) : taille de police et
 * taille des affiches, appliquées globalement via des attributs sur <html>
 * (cf. app/layout.tsx) et consommées en CSS (styles/globals.css).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SizePreference = "petit" | "moyen" | "grand";

type SettingsState = {
  fontSize: SizePreference;
  posterSize: SizePreference;
  setFontSize: (size: SizePreference) => void;
  setPosterSize: (size: SizePreference) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: "moyen",
      posterSize: "moyen",
      setFontSize: (fontSize) => set({ fontSize }),
      setPosterSize: (posterSize) => set({ posterSize }),
    }),
    { name: "emdb-settings" },
  ),
);
