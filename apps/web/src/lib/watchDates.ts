/**
 * Logique partagée de sélection de date pour "marquer comme vu" (modification M) —
 * réutilisée par WatchButton (bouton principal + long clic) et
 * TitleQuickActionsMenu (menu ⋮), pour que les deux exposent exactement le
 * même choix de dates avec la même résolution.
 */

/** Utilisée quand l'utilisateur choisit "date inconnue" — la colonne
 * `date_vue` n'est pas nullable en base, donc on ne peut pas y stocker
 * l'absence de date. */
export const UNKNOWN_WATCH_DATE = "1900-01-01T00:00:00.000Z";

export type WatchDateSelection =
  | { type: "now" }
  | { type: "until-here" }
  | { type: "release" }
  | { type: "custom" }
  | { type: "unknown" };

/**
 * Résout une sélection en date ISO à envoyer au backend.
 * Retourne `undefined` pour "custom" (le picker de date gère lui-même la
 * résolution finale) et pour "until-here" (traité par une mutation dédiée,
 * pas par `createWatch`).
 */
export function resolveWatchDateVue(
  selection: WatchDateSelection,
  releaseDate?: string | null,
): string | undefined {
  switch (selection.type) {
    case "now":
      return new Date().toISOString();
    case "release":
      return releaseDate ? new Date(releaseDate).toISOString() : new Date().toISOString();
    case "unknown":
      return UNKNOWN_WATCH_DATE;
    default:
      return undefined;
  }
}
