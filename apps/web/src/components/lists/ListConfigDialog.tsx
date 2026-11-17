/**
 * « Configurer la liste » : nom, description, paramètres de partage et
 * suppression, dans un seul dialogue (menu du bouton crayon de la page liste).
 * Listes personnalisées uniquement : Watchlist et Favoris ne se configurent pas.
 */

"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useUpdateList } from "@/hooks/api/useUpdateList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ListSharePanel } from "./ListShareDialog";
import { ShareMode } from "@/lib/types/api";

type ListConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: { id: string; nom: string; description?: string | null; share_mode?: ShareMode };
  /** Renommer / décrire (créateur, ou membre en collaboratif / ouvert). */
  canEdit: boolean;
  /** Partage : créateur uniquement. */
  canShare: boolean;
  /** Suppression : créateur uniquement — la confirmation est gérée par l'appelant. */
  onDelete?: () => void;
};

export function ListConfigDialog({
  open,
  onOpenChange,
  list,
  canEdit,
  canShare,
  onDelete,
}: ListConfigDialogProps) {
  const [nom, setNom] = useState(list.nom);
  const [description, setDescription] = useState(list.description ?? "");
  const updateList = useUpdateList();

  useEffect(() => {
    if (open) {
      setNom(list.nom);
      setDescription(list.description ?? "");
    }
  }, [open, list.nom, list.description]);

  const dirty = nom.trim() !== list.nom || (description || "") !== (list.description ?? "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || !nom.trim()) return;
    updateList.mutate({
      listId: list.id,
      data: { nom: nom.trim(), description: description || undefined },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurer la liste</DialogTitle>
          <DialogDescription>Nom, description, partage et suppression de « {list.nom} ».</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {canEdit && (
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="config-nom">Nom</Label>
                <Input
                  id="config-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-description">Description (optionnelle)</Label>
                <Textarea
                  id="config-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                {updateList.isSuccess && !dirty && (
                  <span className="text-xs text-muted-foreground">Enregistré.</span>
                )}
                {updateList.isError && (
                  <span className="text-xs text-destructive">Erreur lors de l&apos;enregistrement.</span>
                )}
                <Button type="submit" size="sm" disabled={!dirty || !nom.trim() || updateList.isPending}>
                  Enregistrer
                </Button>
              </div>
            </form>
          )}

          {canShare && (
            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Partage</h3>
              <ListSharePanel
                list={{ id: list.id, nom: list.nom, share_mode: list.share_mode ?? "lecture" }}
                active={open}
              />
            </section>
          )}

          {onDelete && (
            <section className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer la liste
              </Button>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
