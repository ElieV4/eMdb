/**
 * Applique la préférence "taille de police" sur <html> via un effet, après
 * montage — l'appliquer directement dans le JSX SSR de app/layout.tsx
 * provoquerait un mismatch d'hydratation (le store zustand persist ne lit
 * localStorage que côté client, donc le rendu serveur ne connaît jamais la
 * vraie préférence sauvegardée). La taille des affiches n'a pas besoin de
 * cet attribut : elle est lue directement depuis le store par chaque carte
 * (cf. hooks/usePosterScale.ts).
 */

"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";

export function SettingsSync() {
  const fontSize = useSettingsStore((s) => s.fontSize);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  return null;
}
