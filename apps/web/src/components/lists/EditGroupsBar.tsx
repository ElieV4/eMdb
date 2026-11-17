/**
 * Barre "Ranger dans un groupe" du mode édition d'une liste ("Modifier le
 * contenu") : choix du groupe ou sous-groupe cible. Une fois choisi, chaque
 * carte affiche un bouton pour l'y ajouter ou l'en retirer en un clic
 * (cf. ListReorder / GroupToggleButton).
 */

"use client";

import { FolderTree } from "lucide-react";
import { flattenGroupTree } from "@/lib/listGroups";
import { ListGroup } from "@/lib/types/api";

type EditGroupsBarProps = {
  groups: ListGroup[];
  targetGroupId: string | null;
  onTargetChange: (groupId: string | null) => void;
  /** Nombre de titres rangés directement dans chaque groupe. */
  counts: Map<string, number>;
};

export function EditGroupsBar({ groups, targetGroupId, onTargetChange, counts }: EditGroupsBarProps) {
  const nodes = flattenGroupTree(groups);

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Pour ranger les titres, créez d&apos;abord un sous-groupe (bouton « Sous-groupe » hors du mode
        édition).
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <FolderTree className="h-4 w-4 text-muted-foreground" />
      <label htmlFor="edit-target-group" className="text-sm font-medium">
        Ranger dans
      </label>
      <select
        id="edit-target-group"
        value={targetGroupId ?? ""}
        onChange={(e) => onTargetChange(e.target.value || null)}
        className="h-8 rounded-md border bg-background px-2 text-sm"
      >
        <option value="">Choisir un groupe…</option>
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {"  ".repeat(node.depth)}
            {node.depth > 0 ? "› " : ""}
            {node.nom} ({counts.get(node.id) ?? 0})
          </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">
        {targetGroupId
          ? "Cliquez sur « Ajouter » ou « Retirer » sous chaque titre. « Groupes… » pour choisir plusieurs groupes."
          : "« Groupes… » sous un titre pour choisir tous ses groupes d'un coup."}
      </span>
    </div>
  );
}
