/**
 * Logique pure du module « Modifier le contenu » : actions proposées selon
 * la page et les droits, et calcul des modifications à envoyer.
 */

export type BulkActionId =
  | "markWatched"
  | "removeFromActive"
  | "addToList"
  | "removeFromList"
  | "addToGroup"
  | "removeFromGroup"
  | "deleteHistory"
  | "reorder";

export type BulkItem = {
  /** Clé de sélection (id du titre, ou id du visionnage dans l'historique). */
  id: string;
  titleId: string;
  /** Historique uniquement. */
  watchId?: string;
  /** Titre TMDB pas encore importé (Découvrir) : importé avant l'action. */
  local?: boolean;
  tmdbId?: number;
  type?: "film" | "serie";
};

export type BulkContext = {
  /** Liste affichée (page liste, watchlist). Absent dans l'historique. */
  activeList?: { id: string; nom: string };
  /** Retirer de la liste active (droit item:remove). */
  canRemoveFromActive?: boolean;
  /** Ranger dans les groupes / réordonner (droit item:update). */
  canEditItems?: boolean;
  /** La liste active a des groupes. */
  hasGroups?: boolean;
  /** Historique : supprimer des visionnages. */
  allowDeleteHistory?: boolean;
  /** Le réordonnancement (glisser-déposer) est disponible sur cette page. */
  allowReorder?: boolean;
};

export const ACTION_LABELS: Record<BulkActionId, string> = {
  markWatched: "Marquer comme vu",
  removeFromActive: "Retirer de cette liste",
  addToList: "Ajouter à une autre liste",
  removeFromList: "Retirer d'une autre liste",
  addToGroup: "Ajouter à un groupe",
  removeFromGroup: "Retirer d'un groupe",
  deleteHistory: "Supprimer de l'historique",
  reorder: "Réordonner (glisser-déposer)",
};

/** Actions proposées, dans l'ordre d'affichage. */
export function availableActions(ctx: BulkContext): BulkActionId[] {
  const actions: BulkActionId[] = ["markWatched"];
  if (ctx.activeList && ctx.canRemoveFromActive) actions.push("removeFromActive");
  actions.push("addToList", "removeFromList");
  if (ctx.activeList && ctx.canEditItems && ctx.hasGroups) actions.push("addToGroup", "removeFromGroup");
  if (ctx.allowDeleteHistory) actions.push("deleteHistory");
  if (ctx.activeList && ctx.canEditItems && ctx.allowReorder) actions.push("reorder");
  return actions;
}

/** L'action demande-t-elle un paramètre (liste ou groupe cible) ? */
export function actionTarget(action: BulkActionId): "list" | "group" | null {
  if (action === "addToList" || action === "removeFromList") return "list";
  if (action === "addToGroup" || action === "removeFromGroup") return "group";
  return null;
}

/** Ids de titres distincts (l'historique peut sélectionner plusieurs visionnages d'un titre). */
export function uniqueTitleIds(items: BulkItem[]): string[] {
  return [...new Set(items.map((i) => i.titleId))];
}

/**
 * Nouveaux groupes de chaque titre pour ajouter à / retirer d'un groupe, en
 * gardant ses autres groupes. Les titres déjà dans l'état voulu sont omis.
 */
export function groupUpdates(
  titleIds: string[],
  groupIdsByTitle: Map<string, string[]>,
  groupId: string,
  mode: "add" | "remove",
): { titleId: string; groupIds: string[] }[] {
  const updates: { titleId: string; groupIds: string[] }[] = [];
  for (const titleId of titleIds) {
    const current = groupIdsByTitle.get(titleId) ?? [];
    const has = current.includes(groupId);
    if (mode === "add" && !has) updates.push({ titleId, groupIds: [...current, groupId] });
    if (mode === "remove" && has) updates.push({ titleId, groupIds: current.filter((g) => g !== groupId) });
  }
  return updates;
}
