/**
 * Dialogue "Ranger" : choisir les sous-groupes dans lesquels un titre de la
 * liste est rangé (plusieurs possibles).
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSetItemGroups } from "@/hooks/api/useListGroups";
import { flattenGroupTree } from "@/lib/listGroups";
import { ListGroup } from "@/lib/types/api";

type ItemGroupsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  groups: ListGroup[];
  item: { id: string; titre: string; groupIds: string[] } | null;
};

export function ItemGroupsDialog({ open, onOpenChange, listId, groups, item }: ItemGroupsDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const setItemGroups = useSetItemGroups();
  const nodes = flattenGroupTree(groups);

  useEffect(() => {
    if (open && item) {
      setSelected(new Set(item.groupIds));
      setError("");
    }
  }, [open, item]);

  const toggle = (groupId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleSave = () => {
    if (!item) return;
    setItemGroups.mutate(
      { listId, titleId: item.id, groupIds: [...selected] },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setError(err instanceof Error ? err.message : "Erreur."),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ranger « {item?.titre} »</DialogTitle>
        </DialogHeader>
        <ul className="max-h-72 space-y-1 overflow-auto">
          {nodes.map((node) => (
            <li key={node.id} style={{ paddingLeft: `${node.depth * 16}px` }}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  checked={selected.has(node.id)}
                  onChange={() => toggle(node.id)}
                  className="h-4 w-4 accent-primary"
                />
                {node.nom}
              </label>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Un titre rangé dans un sous-groupe apparaît aussi dans ses groupes parents.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSave} disabled={setItemGroups.isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
