/**
 * Dialog "Gérer l'historique de visionnage" (modification M) — liste les
 * visionnages d'un titre ou d'un épisode avec suppression par ligne.
 * Remplace les 3 implémentations inline redondantes qui existaient jusqu'ici
 * (TitleActions, page épisode, WatchButton n'en avait aucune).
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export type HistoryDialogWatch = {
  id: string;
  date_vue: string;
};

type HistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watches: HistoryDialogWatch[];
  onDelete: (watchId: string) => void;
  emptyLabel?: string;
};

export function HistoryDialog({
  open,
  onOpenChange,
  watches,
  onDelete,
  emptyLabel = "Aucun visionnage enregistré.",
}: HistoryDialogProps) {
  const sorted = [...watches].sort(
    (a, b) => new Date(b.date_vue).getTime() - new Date(a.date_vue).getTime(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historique de visionnage</DialogTitle>
          <DialogDescription>
            Visionnages enregistrés — supprimez une entrée pour la retirer de
            l&apos;historique.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          )}
          {sorted.map((watch) => (
            <div
              key={watch.id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              {/* La date "inconnue" (sentinelle 01-01-1900, cf. resolveWatchDateVue)
                  s'affiche telle quelle plutôt que d'être masquée derrière un
                  libellé — reste visible et reconnaissable dans l'historique. */}
              <p className="text-sm">
                {new Date(watch.date_vue).toLocaleString("fr-FR")}
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(watch.id)}
                aria-label="Supprimer ce visionnage"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
