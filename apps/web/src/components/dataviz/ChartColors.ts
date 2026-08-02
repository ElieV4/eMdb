/**
 * Couleurs partagées pour les graphiques Recharts (Phase 6).
 * Basées sur les design tokens eMDB (apps/web/design-tokens.ts).
 */

export const CHART_COLORS = {
  primary: "#e50914",
  primaryHover: "#ff1a25",
  accent: "#ffc107",
  success: "#4caf50",
  warning: "#ff9800",
  info: "#2196f3",
  purple: "#9c27b0",
  teal: "#009688",
  orange: "#ff5722",
  pink: "#e91e63",
  indigo: "#3f51b5",
  cyan: "#00bcd4",
  lime: "#cddc39",
  brown: "#795548",
  blueGrey: "#607d8b",
} as const;

/** Palette pour les graphiques en barres (genre/pays). */
export const BAR_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.primaryHover,
  CHART_COLORS.accent,
  CHART_COLORS.warning,
  CHART_COLORS.success,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.orange,
  CHART_COLORS.pink,
  CHART_COLORS.indigo,
  CHART_COLORS.cyan,
] as const;

/** Palette pour le camembert (animation vs live-action). */
export const ANIMATION_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.info,
] as const;

/**
 * Palette divergente (rouge → gris neutre → bleu) — utilisée pour l'axe
 * "Légende" des barcharts/linechart dataviz quand il est actif (≠
 * "Aucune"). `BAR_PALETTE` place `primary`/`primaryHover` (deux rouges
 * quasi identiques) côte à côte : sur une légende à plusieurs séries, les
 * deux premiers segments/lignes se confondent visuellement (retour
 * utilisateur — "même couleur tout le temps"). Cette palette écarte
 * chaque teinte de la suivante (rouge → orange → rose pâle → gris → bleu
 * pâle → bleu → bleu foncé) pour rester distinguable même sur les
 * premiers slots.
 */
export const DIVERGING_PALETTE = [
  "#b2182b",
  "#d6604d",
  "#f4a582",
  "#fddbc7",
  "#9e9e9e",
  "#d1e5f0",
  "#92c5de",
  "#4393c3",
  "#2166ac",
] as const;

/** Couleur du texte secondaire (axes, légendes). */
export const AXIS_COLOR = "#b0b0b0";

/** Couleur de la grille. */
export const GRID_COLOR = "#333333";

/** Couleur du tooltip (fond). */
export const TOOLTIP_BG = "#1f1f1f";

/** Couleur du tooltip (bordure). */
export const TOOLTIP_BORDER = "#333333";
