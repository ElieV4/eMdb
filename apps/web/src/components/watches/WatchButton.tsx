/**
 * Bouton "Marquer comme vu" — état machine unifiée (modification M).
 *
 * Clic simple, dans les deux états, ouvre le dropdown (le concept de clic
 * prolongé pour l'état "non vu" s'est révélé peu fiable à l'usage — retiré
 * sur retour utilisateur) :
 *
 * État "non vu" : dropdown (À l'instant / Jusqu'ici si épisode / À la date
 * de sortie / Autre date... / Date inconnue).
 *
 * État "vu" (ou "vu xN") : dropdown avec
 *   - "Revoir" (sous-menu, mêmes options que ci-dessus, libellés "Revu")
 *   - "Gérer l'historique de visionnage" (ouvre HistoryDialog)
 *   - "Annuler le visionnage" (confirmation puis suppression de tous les
 *     visionnages de ce titre/épisode)
 */

"use client";

import { useState, useCallback } from "react";
import { useCreateWatch } from "@/hooks/api/useCreateWatch";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { useUpdateWatchContext } from "@/hooks/api/useUpdateWatchContext";
import { useDeleteAllWatches } from "@/hooks/api/useDeleteAllWatches";
import { useDeleteAllWatchesByEpisode } from "@/hooks/api/useDeleteAllWatchesByEpisode";
import { useMarkWatchedUntilEpisode } from "@/hooks/api/useMarkWatchedUntilEpisode";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
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
import { WatchDateMenuItems } from "./WatchDateMenuItems";
import { WatchDatePickerDialog } from "./WatchDatePickerDialog";
import { HistoryDialog, HistoryDialogWatch } from "./HistoryDialog";
import { Check, Eye, RotateCcw, History as HistoryIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveWatchDateVue, WatchDateSelection } from "@/lib/watchDates";

type WatchButtonProps = {
  titleId?: string;
  episodeId?: string;
  /** Date de sortie du titre/épisode — active l'option "à la date de sortie". */
  releaseDate?: string | null;
  /** Visionnages existants de CE titre/épisode (pas ceux d'autres titres). */
  watches?: HistoryDialogWatch[];
  className?: string;
  /** Appelé après toute mutation réussie (marquer/revoir/jusqu'ici/annuler). */
  onChanged?: () => void;
  /** Bouton icône seule (label accessible mais visuellement masqué) — contexte compact, ex. sous l'affiche du TitleHero. */
  compact?: boolean;
};

export function WatchButton({
  titleId,
  episodeId,
  releaseDate,
  watches = [],
  className,
  onChanged,
  compact = false,
}: WatchButtonProps) {
  const watched = watches.length > 0;
  const watchCount = watches.length;

  const [open, setOpen] = useState(false);
  const [datePicker, setDatePicker] = useState<{ open: boolean; labelPrefix: "Vu" | "Revu" }>({
    open: false,
    labelPrefix: "Vu",
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const createWatch = useCreateWatch();
  const deleteWatch = useDeleteWatch();
  const updateWatchContext = useUpdateWatchContext();
  const deleteAllByTitle = useDeleteAllWatches();
  const deleteAllByEpisode = useDeleteAllWatchesByEpisode();
  const markUntilHere = useMarkWatchedUntilEpisode();

  const finishMutation = useCallback(() => {
    setOpen(false);
    onChanged?.();
  }, [onChanged]);

  const performMark = useCallback(
    (dateVue: string | undefined) => {
      createWatch.mutate(
        {
          title_id: episodeId ? undefined : titleId,
          episode_id: episodeId,
          date_vue: dateVue,
        },
        { onSuccess: finishMutation },
      );
    },
    [createWatch, episodeId, titleId, finishMutation],
  );

  const handleSelect = useCallback(
    (selection: WatchDateSelection, labelPrefix: "Vu" | "Revu") => {
      if (selection.type === "until-here") {
        if (!episodeId) return;
        markUntilHere.mutate({ episode_id: episodeId }, { onSuccess: finishMutation });
        return;
      }
      if (selection.type === "custom") {
        setOpen(false);
        setDatePicker({ open: true, labelPrefix });
        return;
      }
      performMark(resolveWatchDateVue(selection, releaseDate));
    },
    [episodeId, markUntilHere, finishMutation, performMark, releaseDate],
  );

  const handleConfirmDeleteAll = useCallback(() => {
    const onSuccess = () => {
      setConfirmDeleteOpen(false);
      finishMutation();
    };
    if (episodeId) {
      deleteAllByEpisode.mutate(episodeId, { onSuccess });
    } else if (titleId) {
      deleteAllByTitle.mutate(titleId, { onSuccess });
    }
  }, [episodeId, titleId, deleteAllByEpisode, deleteAllByTitle, finishMutation]);

  const handleDeleteOne = useCallback(
    (watchId: string) => {
      deleteWatch.mutate(watchId, { onSuccess: () => onChanged?.() });
    },
    [deleteWatch, onChanged],
  );

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        {/* `render` fusionne le déclencheur du menu sur CE bouton au lieu
            d'imbriquer un <button> dans un autre <button> (HTML invalide qui
            empêchait le clic de marquer comme vu, bug #45). Clic simple
            ouvre le dropdown dans les deux états (comportement natif Base
            UI) — le clic prolongé initialement prévu pour l'état "non vu"
            s'est révélé peu fiable à l'usage. */}
        <DropdownMenuTrigger
          render={
            <Button
              size={compact ? "icon" : "default"}
              aria-label={watched ? (watchCount > 1 ? `Vu x${watchCount}` : "Vu") : "Marquer comme vu"}
              className={cn(className, watched && "bg-primary text-primary-foreground")}
            >
              {watched ? (
                <>
                  <Eye className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                  {!compact && (watchCount > 1 ? `Vu x${watchCount}` : "Vu")}
                </>
              ) : (
                <>
                  <Check className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                  {!compact && "Marquer comme vu"}
                </>
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {!watched ? (
            <WatchDateMenuItems
              labelPrefix="Vu"
              releaseDate={releaseDate}
              showUntilHere={!!episodeId}
              onSelect={(selection) => handleSelect(selection, "Vu")}
            />
          ) : (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  <span>Revoir</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <WatchDateMenuItems
                      labelPrefix="Revu"
                      releaseDate={releaseDate}
                      showUntilHere={!!episodeId}
                      onSelect={(selection) => handleSelect(selection, "Revu")}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem
                onClick={() => setHistoryOpen(true)}
                className="cursor-pointer"
              >
                <HistoryIcon className="mr-2 h-4 w-4" />
                <span>Gérer l&apos;historique de visionnage</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDeleteOpen(true)}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Annuler le visionnage</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <WatchDatePickerDialog
        open={datePicker.open}
        onOpenChange={(next) => setDatePicker((prev) => ({ ...prev, open: next }))}
        title={`${datePicker.labelPrefix} à une date...`}
        onConfirm={(dateIso) => performMark(dateIso)}
      />

      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        watches={watches}
        onDelete={handleDeleteOne}
        onUpdateContext={(watchId, patch) => updateWatchContext.mutate({ watchId, data: patch })}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le visionnage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les visionnages enregistrés pour{" "}
              {episodeId ? "cet épisode" : "ce titre"} seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDeleteAll}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
