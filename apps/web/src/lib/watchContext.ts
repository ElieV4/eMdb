/**
 * Contexte de visionnage (support / compagnie / émotion) — saisi soit a
 * posteriori depuis HistoryDialog, soit juste après la création du watch
 * via WatchContextPopup (selon le réglage `watchContextPopup`, Paramètres).
 * Valeurs identiques à apps/api/src/watches/dto/update-watch-context.dto.ts.
 */

import { Laptop, Tv, Smartphone, Clapperboard, LucideIcon } from "lucide-react";

export type WatchSupport = "ordinateur" | "tv" | "telephone" | "cinema";
export type WatchCompagnie = "seul" | "accompagne";
export type WatchEmotion =
  | "joie"
  | "rire"
  | "emerveillement"
  | "tendresse"
  | "nostalgie"
  | "tristesse"
  | "choc"
  | "fascination"
  | "tension"
  | "peur"
  | "revolte"
  | "malaise";

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

/**
 * Tags d'émotion (évaluation par émotion) : emoji, nom, couleur et usage.
 * Mêmes valeurs côté API (apps/api/src/watches/dto/update-watch-context.dto.ts).
 */
export const WATCH_EMOTION_OPTIONS: {
  value: WatchEmotion;
  label: string;
  emoji: string;
  /** Couleur du tag (pastille sélectionnée). */
  color: string;
  hint: string;
}[] = [
  { value: "joie", label: "Joie", emoji: "😄", color: "#FACC15", hint: "Films solaires et feel-good" },
  { value: "rire", label: "Rire", emoji: "😂", color: "#FDBA74", hint: "Comédies franches, humour efficace" },
  { value: "emerveillement", label: "Émerveillement", emoji: "✨", color: "#2DD4BF", hint: "Magie, beauté visuelle, grand spectacle" },
  { value: "tendresse", label: "Tendresse", emoji: "🥹", color: "#F472B6", hint: "Romance, amitié, attachement aux personnages" },
  { value: "nostalgie", label: "Nostalgie", emoji: "🕰️", color: "#D97706", hint: "Ambiances rétro, enfance, souvenirs" },
  { value: "tristesse", label: "Tristesse", emoji: "😢", color: "#3B82F6", hint: "Drames émouvants" },
  { value: "choc", label: "Choc", emoji: "🤯", color: "#A855F7", hint: "Retournements de situation, surprise" },
  { value: "fascination", label: "Fascination", emoji: "🧠", color: "#6366F1", hint: "Scénarios brillants qui font réfléchir" },
  { value: "tension", label: "Tension", emoji: "😬", color: "#EA580C", hint: "Suspense, adrénaline" },
  { value: "peur", label: "Peur", emoji: "😱", color: "#4B5563", hint: "Horreur, angoisse, sursauts" },
  { value: "revolte", label: "Révolte", emoji: "😡", color: "#EF4444", hint: "Injustice, colère, sujets engagés" },
  { value: "malaise", label: "Malaise", emoji: "🤢", color: "#84CC16", hint: "Dérangeant, malaise psychologique, dégoût" },
];

export function supportLabel(value: string | null | undefined): string | null {
  return WATCH_SUPPORT_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

export function compagnieLabel(value: string | null | undefined): string | null {
  return WATCH_COMPAGNIE_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

export function emotionOption(value: string) {
  return WATCH_EMOTION_OPTIONS.find((o) => o.value === value) ?? null;
}

function emotionLabel(value: string): string | null {
  const option = emotionOption(value);
  return option ? `${option.emoji} ${option.label}` : null;
}

/** Emojis des émotions (dans l'ordre donné), ex. "😄🤯". Vide si aucune. */
export function emotionEmojis(values: string[] | null | undefined): string {
  return (values ?? [])
    .map((v) => emotionOption(v)?.emoji)
    .filter(Boolean)
    .join("");
}

/** `emotion` est un tableau (un visionnage peut avoir plusieurs émotions) — jointes pour l'affichage. */
export function emotionLabels(values: string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  const labels = values.map(emotionLabel).filter((l): l is string => Boolean(l));
  return labels.length > 0 ? labels.join(", ") : null;
}
