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
  const [description, setDescription] = useState("");

  const createList = useCreateList();
  const updateList = useUpdateList();

  useEffect(() => {
    if (list) {
      setNom(list.nom);
      setDescription(list.description || "");
    } else {
      setNom("");
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
        // Seules les listes personnalisées sont créables depuis ce formulaire :
        // "Ma Watchlist" et "Mes Favoris" sont uniques par utilisateur et créées
        // automatiquement à l'inscription (cf. bug #42).
        await createList.mutateAsync({
          nom,
          type: "custom",
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
