/**
 * Contexte de visionnage (support / compagnie / émotion) — saisi uniquement
 * a posteriori depuis HistoryDialog, jamais à la création du watch. Valeurs
 * identiques à apps/api/src/watches/dto/update-watch-context.dto.ts.
 */

import { Laptop, Tv, Smartphone, Clapperboard, LucideIcon } from "lucide-react";

export type WatchSupport = "ordinateur" | "tv" | "telephone" | "cinema";
export type WatchCompagnie = "seul" | "accompagne";
export type WatchEmotion =
  | "content"
  | "triste"
  | "emu"
  | "enthousiaste"
  | "decu"
  | "tendu"
  | "effraye"
  | "neutre";

export const WATCH_SUPPORT_OPTIONS: { value: WatchSupport; label: string; icon: LucideIcon }[] = [
  { value: "ordinateur", label: "Ordinateur", icon: Laptop },
  { value: "tv", label: "TV", icon: Tv },
  { value: "telephone", label: "Téléphone", icon: Smartphone },
  { value: "cinema", label: "Cinéma", icon: Clapperboard },
];

export const WATCH_COMPAGNIE_OPTIONS: { value: WatchCompagnie; label: string }[] = [
  { value: "seul", label: "Seul" },
  { value: "accompagne", label: "Accompagné" },
];

export const WATCH_EMOTION_OPTIONS: { value: WatchEmotion; label: string }[] = [
  { value: "content", label: "Content" },
  { value: "triste", label: "Triste" },
  { value: "emu", label: "Ému" },
  { value: "enthousiaste", label: "Enthousiaste" },
  { value: "decu", label: "Déçu" },
  { value: "tendu", label: "Tendu" },
  { value: "effraye", label: "Effrayé" },
  { value: "neutre", label: "Neutre" },
];

export function supportLabel(value: string | null | undefined): string | null {
  return WATCH_SUPPORT_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

export function compagnieLabel(value: string | null | undefined): string | null {
  return WATCH_COMPAGNIE_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

function emotionLabel(value: string): string | null {
  return WATCH_EMOTION_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

/** `emotion` est un tableau (un visionnage peut avoir plusieurs émotions) — jointes pour l'affichage. */
export function emotionLabels(values: string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  const labels = values.map(emotionLabel).filter((l): l is string => Boolean(l));
  return labels.length > 0 ? labels.join(", ") : null;
}
