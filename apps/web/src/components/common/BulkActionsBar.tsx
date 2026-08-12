/**
 * Barre d'actions groupées affichée quand le mode sélection ("Modifier le
 * contenu") est actif et qu'au moins un item est sélectionné. Applique en
 * masse un sous-ensemble des actions du menu "⋮" (`TitleQuickActionsMenu`)
 * à toute la sélection — suivre/ne plus suivre, abandonner la série,
 * favoris, et (page Historique uniquement) supprimer de l'historique.
 *
 * Pas d'endpoint bulk côté API : chaque action boucle sur les titres/watchs
 * sélectionnés (dédoublonnés par titre) via les hooks de mutation existants.
 */

"use client";

import { useState } from "react";
import {
  BookmarkPlus,
  BookmarkMinus,
  Heart,
  HeartOff,
  Archive,
  Trash2,
  ListChecks,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAddItem } from "@/hooks/api/useAddItem";
import { useRemoveItem } from "@/hooks/api/useRemoveItem";
import { useUpdateListItemStatus } from "@/hooks/api/useUpdateListItemStatus";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";

export type BulkSelectableItem = {
  /** Clé de sélection (title_id, ou watch.id sur la page Historique). */
  id: string;
  titleId: string;
  type: "film" | "serie";
  /** Id du visionnage — uniquement fourni sur la page Historique, requis
   * pour "Supprimer de l'historique". */
  watchId?: string;
};

type BulkActionsBarProps = {
  items: BulkSelectableItem[];
  watchlistId?: string;
  favorisId?: string;
  /** Affiche "Supprimer de l'historique" — page Historique uniquement. */
  allowDeleteHistory?: boolean;
  onDone: () => void;
  className?: string;
};

export function BulkActionsBar({
  items,
  watchlistId,
  favorisId,
  allowDeleteHistory = false,
  onDone,
  className,
}: BulkActionsBarProps) {
  const [open, setOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const addItem = useAddItem();
  const removeItem = useRemoveItem();
  const updateItemStatus = useUpdateListItemStatus();
  const deleteWatch = useDeleteWatch();

  const uniqueTitleIds = Array.from(new Set(items.map((item) => item.titleId)));
  const serieTitleIds = Array.from(
    new Set(items.filter((item) => item.type === "serie").map((item) => item.titleId)),
  );
  const watchIds = Array.from(
    new Set(items.map((item) => item.watchId).filter((id): id is string => !!id)),
  );

  const runForEach = async (titleIds: string[], run: (titleId: string) => Promise<unknown>) => {
    setPending(true);
    try {
      await Promise.all(titleIds.map((titleId) => run(titleId)));
    } finally {
      setPending(false);
      setOpen(false);
      onDone();
    }
  };

  const handleFollow = () =>
    watchlistId &&
    runForEach(uniqueTitleIds, (titleId) =>
      addItem.mutateAsync({ listId: watchlistId, data: { title_id: titleId } }),
    );

  const handleUnfollow = () =>
    watchlistId &&
    runForEach(uniqueTitleIds, (titleId) => removeItem.mutateAsync({ listId: watchlistId, titleId }));

  const handleAbandon = () =>
    watchlistId &&
    runForEach(serieTitleIds, async (titleId) => {
      // L'item peut ne pas encore être dans la watchlist (série suivie via
      // `user_follows_serie` sans y avoir été ajoutée, cf. Continuer à
      // regarder) — addItem est idempotent, donc sûr à appeler avant.
      await addItem.mutateAsync({ listId: watchlistId, data: { title_id: titleId } });
      await updateItemStatus.mutateAsync({ listId: watchlistId, titleId, statut: "abandonnee" });
    });

  const handleAddFavorite = () =>
    favorisId &&
    runForEach(uniqueTitleIds, (titleId) =>
      addItem.mutateAsync({ listId: favorisId, data: { title_id: titleId } }),
    );

  const handleRemoveFavorite = () =>
    favorisId &&
    runForEach(uniqueTitleIds, (titleId) => removeItem.mutateAsync({ listId: favorisId, titleId }));

  const handleDeleteHistory = async () => {
    setPending(true);
    try {
      await Promise.all(watchIds.map((watchId) => deleteWatch.mutateAsync(watchId)));
    } finally {
      setPending(false);
      setConfirmDeleteOpen(false);
      onDone();
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm",
          className,
        )}
      >
        <span className="text-sm font-medium">
          {items.length} sélectionné{items.length > 1 ? "s" : ""}
        </span>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="secondary" size="sm" disabled={pending}>
                <ListChecks className="mr-2 h-4 w-4" />
                Actions
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleFollow} disabled={!watchlistId} className="cursor-pointer">
              <BookmarkPlus className="mr-2 h-4 w-4" />
              Suivre
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUnfollow} disabled={!watchlistId} className="cursor-pointer">
              <BookmarkMinus className="mr-2 h-4 w-4" />
              Ne plus suivre
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleAbandon}
              disabled={!watchlistId || serieTitleIds.length === 0}
              className="cursor-pointer"
            >
              <Archive className="mr-2 h-4 w-4" />
              Abandonner la série
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddFavorite} disabled={!favorisId} className="cursor-pointer">
              <Heart className="mr-2 h-4 w-4" />
              Ajouter aux favoris
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRemoveFavorite} disabled={!favorisId} className="cursor-pointer">
              <HeartOff className="mr-2 h-4 w-4" />
              Supprimer des favoris
            </DropdownMenuItem>
            {allowDeleteHistory && (
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  setConfirmDeleteOpen(true);
                }}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer de l&apos;historique
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          <X className="mr-1 h-4 w-4" />
          Annuler
        </Button>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer de l&apos;historique ?</AlertDialogTitle>
            <AlertDialogDescription>
              {watchIds.length} visionnage{watchIds.length > 1 ? "s" : ""} sélectionné
              {watchIds.length > 1 ? "s" : ""} seront supprimés de l&apos;historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteHistory}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
