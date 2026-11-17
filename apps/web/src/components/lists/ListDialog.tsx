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
import { Trash2 } from "lucide-react";
import { EmojiPicker } from "@/components/common/EmojiPicker";

type ListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: {
    id: string;
    nom: string;
    type: "watchlist" | "favoris" | "custom";
    description?: string | null;
    emoji?: string | null;
  } | null;
  /** Modification seulement : affiche « Supprimer la liste » dans le pied du
   * dialogue (la confirmation est gérée par l'appelant). */
  onDelete?: () => void;
};

export function ListDialog({ open, onOpenChange, list, onDelete }: ListDialogProps) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);

  const createList = useCreateList();
  const updateList = useUpdateList();

  useEffect(() => {
    if (list) {
      setNom(list.nom);
      setDescription(list.description || "");
      setEmoji(list.emoji ?? null);
    } else {
      setNom("");
      setDescription("");
      setEmoji(null);
    }
  }, [list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (list) {
        await updateList.mutateAsync({
          listId: list.id,
          data: { nom, description: description || undefined, emoji: emoji ?? "" },
        });
      } else {
        // Seules les listes personnalisées sont créables depuis ce formulaire :
        // "Ma Watchlist" et "Mes Favoris" sont uniques par utilisateur et créées
        // automatiquement à l'inscription (cf. bug #42).
        await createList.mutateAsync({
          nom,
          type: "custom",
          description: description || undefined,
          ...(emoji ? { emoji } : {}),
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
            <div className="flex items-center gap-2">
              <EmojiPicker value={emoji} onChange={setEmoji} label="Emoji de la liste" />
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                maxLength={100}
              />
            </div>
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
          <DialogFooter className="sm:justify-between">
            {list && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive sm:mr-auto"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer la liste
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
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
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
