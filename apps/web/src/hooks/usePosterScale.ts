/**
 * Multiplicateur numérique pour la taille des affiches (préférence
 * utilisateur, page /settings) — utilisé partout où une carte calcule ses
 * propres dimensions en JS (largeur du wrapper, position des boutons
 * superposés), pas seulement dans TitlePoster lui-même.
 */

import { useSettingsStore } from "@/store/settingsStore";

const SCALE_BY_PREFERENCE = {
  petit: 0.8,
  moyen: 1,
  grand: 1.2,
} as const;

export function usePosterScale(): number {
  const posterSize = useSettingsStore((s) => s.posterSize);
  return SCALE_BY_PREFERENCE[posterSize];
}
