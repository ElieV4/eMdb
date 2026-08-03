/**
 * Mini bouton carré "marquer comme vu" (icone seule) affiché sous le coin
 * bas droit de chaque affiche dans les modules "résultats en ligne"
 * (grilles/sliders de `TitleCard`) et sur les cartes épisode (module
 * "Continuer à regarder") — action directe en un clic, sans passer par le
 * menu actions rapides ("⋮").
 *
 * Deux états : non vu → icone "✓" (valider, marque directement, pas de
 * confirmation) ; déjà vu → icone "œil" (recliquer demande confirmation
 * pour annuler le visionnage — tous les visionnages enregistrés pour ce
 * titre/épisode sont alors supprimés, même règle que `TitleQuickActionsMenu`).
 */

"use client";

import { useState, type CSSProperties } from "react";
import { Check, Eye } from "lucide-react";
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
import { useCreateWatch } from "@/hooks/api/useCreateWatch";
import { useDeleteAllWatches } from "@/hooks/api/useDeleteAllWatches";
import { useDeleteAllWatchesByEpisode } from "@/hooks/api/useDeleteAllWatchesByEpisode";
import { useGetOrImportTitle } from "@/hooks/api/useGetOrImportTitle";
import { cn } from "@/lib/utils";

type TitleWatchedButtonProps = {
  /** Titre à marquer — omis quand `episodeId` est fourni (marquage au niveau épisode). */
  titleId?: string;
  /** Marque un épisode précis plutôt que le titre — prioritaire sur `titleId`. */
  episodeId?: string;
  tmdbId?: number;
  type?: "film" | "serie";
  local?: boolean;
  watched?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function TitleWatchedButton({
  titleId,
  episodeId,
  tmdbId,
  type,
  local = true,
  watched = false,
  className,
  style,
}: TitleWatchedButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const createWatch = useCreateWatch();
  const getOrImportTitle = useGetOrImportTitle();
  const deleteAllByTitle = useDeleteAllWatches();
  const deleteAllByEpisode = useDeleteAllWatchesByEpisode();

  const markWatched = async () => {
    if (episodeId) {
      createWatch.mutate({ episode_id: episodeId, date_vue: undefined });
      return;
    }

    if (!titleId) return;
    let resolvedId = titleId;
    if (!local) {
      if (!tmdbId || !type) return;
      const imported = await getOrImportTitle.mutateAsync({ tmdbId, type });
      resolvedId = imported.id;
    }

    createWatch.mutate({ title_id: resolvedId, date_vue: undefined });
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (watched) {
      setConfirmOpen(true);
      return;
    }

    markWatched();
  };

  const handleConfirmCancel = () => {
    if (episodeId) {
      deleteAllByEpisode.mutate(episodeId);
    } else if (titleId) {
      deleteAllByTitle.mutate(titleId);
    }
    setConfirmOpen(false);
  };

  const isPending =
    createWatch.isPending ||
    getOrImportTitle.isPending ||
    deleteAllByTitle.isPending ||
    deleteAllByEpisode.isPending;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={watched ? "Déjà vu" : "Marquer comme vu"}
        title={watched ? "Déjà vu" : "Marquer comme vu"}
        style={style}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white transition-colors hover:bg-black/90 disabled:opacity-50",
          className,
        )}
      >
        {watched ? <Eye className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le visionnage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les visionnages enregistrés pour {episodeId ? "cet épisode" : "ce titre"} seront
              supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmCancel}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
