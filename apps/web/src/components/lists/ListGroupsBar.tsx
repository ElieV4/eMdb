/**
 * Barre des sous-groupes d'une liste (ex. Sport › Tennis) : filtre les
 * titres affichés par sous-groupe (descendants inclus) et, selon les droits,
 * permet de créer, renommer ou supprimer des sous-groupes.
 */

"use client";

import { useState } from "react";
import { FolderPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GroupNameDialog } from "./GroupNameDialog";
import { useCreateGroup, useDeleteGroup, useRenameGroup } from "@/hooks/api/useListGroups";
import { flattenGroupTree, GroupNode } from "@/lib/listGroups";
import { ListCapabilities, ListGroup } from "@/lib/types/api";
import { cn } from "@/lib/utils";

type ListGroupsBarProps = {
  listId: string;
  groups: ListGroup[];
  capabilities: ListCapabilities;
  /** Nombre de titres par groupe, descendants inclus. */
  counts: Map<string, number>;
  totalCount: number;
  selectedGroupId: string | null;
  onSelect: (groupId: string | null) => void;
};

type NameDialogState =
  | { kind: "create"; parent: GroupNode | null }
  | { kind: "rename"; group: GroupNode }
  | null;

export function ListGroupsBar({
  listId,
  groups,
  capabilities,
  counts,
  totalCount,
  selectedGroupId,
  onSelect,
}: ListGroupsBarProps) {
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [toDelete, setToDelete] = useState<GroupNode | null>(null);
  const createGroup = useCreateGroup();
  const renameGroup = useRenameGroup();
  const deleteGroup = useDeleteGroup();

  const nodes = flattenGroupTree(groups);
  const canCreate = capabilities.canAddItems;
  const canRename = capabilities.canEditItems;
  const canDelete = capabilities.canRemoveItems;

  if (nodes.length === 0 && !canCreate) return null;

  const handleNameSubmit = async (nom: string) => {
    if (!nameDialog) return;
    if (nameDialog.kind === "create") {
      await createGroup.mutateAsync({ listId, nom, parentId: nameDialog.parent?.id });
    } else {
      await renameGroup.mutateAsync({ listId, groupId: nameDialog.group.id, nom });
    }
    setNameDialog(null);
  };

  const chip = (label: string, count: number, selected: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
        selected ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  return (
    <div className="space-y-2" aria-label="Sous-groupes">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border p-1">
        {chip("Tous", totalCount, selectedGroupId === null, () => onSelect(null))}
        {nodes.map((node) => {
          const selected = selectedGroupId === node.id;
          const hasMenu = canCreate || canRename || canDelete;
          return (
            <span key={node.id} className="inline-flex items-center">
              {chip(
                `${node.depth > 0 ? "› ".repeat(node.depth) : ""}${node.nom}`,
                counts.get(node.id) ?? 0,
                selected,
                () => onSelect(selected ? null : node.id),
              )}
              {selected && hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                        aria-label={`Gérer le sous-groupe ${node.nom}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="start">
                    {canCreate && (
                      <DropdownMenuItem onClick={() => setNameDialog({ kind: "create", parent: node })}>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        Nouveau sous-groupe dans « {node.nom} »
                      </DropdownMenuItem>
                    )}
                    {canRename && (
                      <DropdownMenuItem onClick={() => setNameDialog({ kind: "rename", group: node })}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Renommer
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem variant="destructive" onClick={() => setToDelete(node)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </span>
          );
        })}
        {/* Nouveau sous-groupe : tout à droite, icône seule, libellé au survol. */}
        {canCreate && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setNameDialog({ kind: "create", parent: null })}
                  aria-label="Ajouter un nouveau sous-groupe"
                  className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              }
            />
            <TooltipContent>Ajouter un nouveau sous-groupe</TooltipContent>
          </Tooltip>
        )}
      </div>

      <GroupNameDialog
        open={nameDialog !== null}
        onOpenChange={(open) => !open && setNameDialog(null)}
        title={
          nameDialog?.kind === "rename"
            ? "Renommer le sous-groupe"
            : nameDialog?.parent
              ? `Nouveau sous-groupe dans « ${nameDialog.parent.nom} »`
              : "Nouveau sous-groupe"
        }
        initialName={nameDialog?.kind === "rename" ? nameDialog.group.nom : ""}
        submitLabel={nameDialog?.kind === "rename" ? "Renommer" : "Créer"}
        onSubmit={handleNameSubmit}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {toDelete?.nom} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ses sous-groupes sont supprimés aussi. Les titres restent dans la liste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!toDelete) return;
                deleteGroup.mutate(
                  { listId, groupId: toDelete.id },
                  {
                    onSuccess: () => {
                      if (selectedGroupId === toDelete.id) onSelect(null);
                      setToDelete(null);
                    },
                  },
                );
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
