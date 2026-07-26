/**
 * Item d'historique de visionnage.
 * Affiche un watch individuel avec titre, date, possibilité de supprimer.
 *
 * Phase 4.1 — Watches
 */

"use client";

import { UserWatch } from "@/lib/types/api";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type WatchHistoryItemProps = {
  watch: UserWatch;
  className?: string;
};

export function WatchHistoryItem({ watch, className }: WatchHistoryItemProps) {
  const deleteWatch = useDeleteWatch();

  const title = watch.title || watch.episode;
  if (!title) return null;

  const handleDelete = async () => {
    await deleteWatch.mutateAsync(watch.id);
  };

  const formattedDate = new Date(watch.date).toLocaleDateString("fr-FR");

  return (
    <div className={cn("flex items-center justify-between p-3 border rounded-md", className)}>
      <div className="flex-1">
        <p className="font-medium text-sm">
          {watch.title ? (watch.title as any).titre : `Episode ${watch.episode?.numero}`}
        </p>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger>
          <Button variant="ghost" size="sm" disabled={deleteWatch.isPending}>
            Supprimer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce visionnage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}