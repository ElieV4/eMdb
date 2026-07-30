/**
 * Dialog de création/édition de liste.
 *
 * Phase 4.3 — Lists
 */

"use client";

import { useState, useEffect } from "react";
import { useCreateList } from "@/hooks/api/useCreateList";
import { useUpdateList } from "@/hooks/api/useUpdateList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: {
    id: string;
    nom: string;
    type: "watchlist" | "favoris" | "custom";
    description?: string | null;
  } | null;
};

export function ListDialog({ open, onOpenChange, list }: ListDialogProps) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<"watchlist" | "favoris" | "custom">(
    "watchlist",
  );
  const [description, setDescription] = useState("");

  const createList = useCreateList();
  const updateList = useUpdateList();

  useEffect(() => {
    if (list) {
      setNom(list.nom);
      setType(list.type);
      setDescription(list.description || "");
    } else {
      setNom("");
      setType("watchlist");
      setDescription("");
    }
  }, [list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (list) {
        await updateList.mutateAsync({
          listId: list.id,
          data: { nom, description: description || undefined },
        });
      } else {
        await createList.mutateAsync({
          nom,
          type,
          description: description || undefined,
        });
      }
      onOpenChange(false);
    } catch {
      // error handled by React Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {list ? "Modifier la liste" : "Créer une liste"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="watchlist">Watchlist</option>
              <option value="favoris">Favoris</option>
              <option value="custom">Personnalisée</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createList.isPending || updateList.isPending}
            >
              {list ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
