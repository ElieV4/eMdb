/**
 * Menu contextuel rapide ("⋮") affiché sur les affiches de titres (films et
 * séries) et d'épisodes, quel que soit le module (modification M). Permet de
 * suivre/ne plus suivre, ajouter/retirer des favoris (titres uniquement),
 * marquer comme vu (même dropdown de dates que WatchButton) / annuler le
 * visionnage, et gérer l'historique de visionnage.
 *
 * Rendu en dehors du `<Link>` de la carte (élément frère positionné en
 * absolu) : un bouton ne peut pas être imbriqué dans un `<a>` (HTML
 * invalide, cf. bug #45) — voir TitleCard.tsx pour la structure.
 */

"use client";

import { useState } from "react";
import {
  MoreVertical,
  BookmarkPlus,
  BookmarkMinus,
  Heart,
  HeartOff,
  History as HistoryIcon,
  Check,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { WatchDateMenuItems } from "@/components/watches/WatchDateMenuItems";
import { WatchDatePickerDialog } from "@/components/watches/WatchDatePickerDialog";
import { HistoryDialog } from "@/components/watches/HistoryDialog";
import { useListMembership } from "@/hooks/api/useListMembership";
import { useUpdateListItemStatus, WatchlistItemStatus } from "@/hooks/api/useUpdateListItemStatus";
import { useAddItem } from "@/hooks/api/useAddItem";
import { useRemoveItem } from "@/hooks/api/useRemoveItem";
import { useCreateWatch } from "@/hooks/api/useCreateWatch";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { useDeleteAllWatches } from "@/hooks/api/useDeleteAllWatches";
import { useDeleteAllWatchesByEpisode } from "@/hooks/api/useDeleteAllWatchesByEpisode";
import { useMarkWatchedUntilEpisode } from "@/hooks/api/useMarkWatchedUntilEpisode";
import { useWatches } from "@/hooks/api/useWatches";
import { useGetOrImportTitle } from "@/hooks/api/useGetOrImportTitle";
import { cn } from "@/lib/utils";
import { resolveWatchDateVue, WatchDateSelection } from "@/lib/watchDates";

type TitleQuickActionsMenuProps = {
  titleId?: string;
  episodeId?: string;
  /** tmdb_id + type : nécessaires pour importer le titre à la volée quand
   * `local` est faux (résultat de recherche pas encore en base — `titleId`
   * n'est alors que le tmdb_id sous forme de chaîne, pas un vrai UUID). */
  tmdbId?: number;
  type?: "film" | "serie";
  local?: boolean;
  releaseDate?: string | null;
  inWatchlist?: boolean;
  inFavorites?: boolean;
  watched?: boolean;
  /** Statut de progression dans la watchlist ("en_cours" / "a_jour" / "abandonnee"). */
  watchlistStatus?: WatchlistItemStatus;
  /**
   * Affiche "Abandonner la série" même si le titre n'est pas (encore) dans
   * la watchlist — cas du module "Continuer à regarder", où une série
   * suivie (`user_follows_serie`) n'a pas forcément d'item de watchlist
   * (mécanismes découplés). L'action ajoute alors l'item à la volée avant
   * de poser le statut "abandonnee".
   */
  allowAbandonWithoutWatchlist?: boolean;
  className?: string;
};

export function TitleQuickActionsMenu({
  titleId,
  episodeId,
  tmdbId,
  type,
  local = true,
  releaseDate,
  inWatchlist = false,
  inFavorites = false,
  watched = false,
  watchlistStatus,
  allowAbandonWithoutWatchlist = false,
  className,
}: TitleQuickActionsMenuProps) {
  const isEpisode = !!episodeId;
  // Un titre non-local n'a pas encore de vrai UUID (TitleCard utilise le
  // tmdb_id comme `id` de repli) — toute action doit d'abord l'importer.
  const needsImport = !isEpisode && !local;
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { watchlistId, favorisId } = useListMembership();
  const addItem = useAddItem();
  const removeItem = useRemoveItem();
  const updateItemStatus = useUpdateListItemStatus();
  const createWatch = useCreateWatch();
  const deleteWatch = useDeleteWatch();
  const deleteAllByTitle = useDeleteAllWatches();
  const deleteAllByEpisode = useDeleteAllWatchesByEpisode();
  const markUntilHere = useMarkWatchedUntilEpisode();
  const getOrImportTitle = useGetOrImportTitle();

  // Chargé uniquement à l'ouverture du popup historique — inutile de le
  // récupérer pour chaque affiche tant que l'utilisateur ne le demande pas.
  // Un titre non-local n'a par définition aucun historique.
  const { data: historyData } = useWatches(
    isEpisode ? { episode_id: episodeId, limit: 50 } : { title_id: titleId, limit: 50 },
    { enabled: historyOpen && !needsImport && !!(titleId || episodeId) },
  );
  const historyWatches = historyData?.items ?? [];

  /** Résout un id de titre local valide, en important à la volée si besoin. */
  const resolveTitleId = async (): Promise<string | undefined> => {
    if (!needsImport) return titleId;
    if (!tmdbId || !type) return undefined;
    const imported = await getOrImportTitle.mutateAsync({ tmdbId, type });
    return imported.id;
  };

  const toggleWatchlist = async () => {
    if (!watchlistId) return;
    if (inWatchlist && titleId) {
      removeItem.mutate({ listId: watchlistId, titleId });
      return;
    }
    const resolvedId = await resolveTitleId();
    if (!resolvedId) return;
    addItem.mutate({ listId: watchlistId, data: { title_id: resolvedId } });
  };

  const toggleFavorite = async () => {
    if (!favorisId) return;
    if (inFavorites && titleId) {
      removeItem.mutate({ listId: favorisId, titleId });
      return;
    }
    const resolvedId = await resolveTitleId();
    if (!resolvedId) return;
    addItem.mutate({ listId: favorisId, data: { title_id: resolvedId } });
  };

  const setWatchlistStatus = async (statut: WatchlistItemStatus) => {
    if (!watchlistId) return;
    const resolvedId = await resolveTitleId();
    if (!resolvedId) return;
    if (!inWatchlist) {
      await addItem.mutateAsync({ listId: watchlistId, data: { title_id: resolvedId } });
    }
    updateItemStatus.mutate({ listId: watchlistId, titleId: resolvedId, statut });
  };

  const finish = () => setOpen(false);

  const performMark = async (dateVue: string | undefined) => {
    const resolvedId = isEpisode ? undefined : await resolveTitleId();
    if (!isEpisode && !resolvedId) return;
    createWatch.mutate(
      { title_id: resolvedId, episode_id: episodeId, date_vue: dateVue },
      { onSuccess: finish },
    );
  };

  const handleSelectWatchDate = (selection: WatchDateSelection) => {
    if (selection.type === "until-here") {
      if (!episodeId) return;
      markUntilHere.mutate({ episode_id: episodeId }, { onSuccess: finish });
      return;
    }
    if (selection.type === "custom") {
      setOpen(false);
      setDatePickerOpen(true);
      return;
    }
    performMark(resolveWatchDateVue(selection, releaseDate));
  };

  const handleConfirmDeleteAll = () => {
    const onSuccess = () => {
      setConfirmDeleteOpen(false);
      setOpen(false);
    };
    if (isEpisode && episodeId) {
      deleteAllByEpisode.mutate(episodeId, { onSuccess });
    } else if (titleId) {
      deleteAllByTitle.mutate(titleId, { onSuccess });
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className={cn(
                "flex items-center justify-center rounded-full bg-black/70 p-1.5 hover:bg-black/90 transition-colors",
                className,
              )}
              aria-label="Actions rapides"
            >
              <MoreVertical className="h-4 w-4 text-white" />
            </button>
          }
        />
        <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
          {!isEpisode && watchlistId && (
            <DropdownMenuItem onClick={toggleWatchlist} className="cursor-pointer">
              {inWatchlist ? (
                <>
                  <BookmarkMinus className="mr-2 h-4 w-4" />
                  Ne plus suivre
                </>
              ) : (
                <>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Suivre
                </>
              )}
            </DropdownMenuItem>
          )}
          {!isEpisode && favorisId && (
            <DropdownMenuItem onClick={toggleFavorite} className="cursor-pointer">
              {inFavorites ? (
                <>
                  <HeartOff className="mr-2 h-4 w-4" />
                  Retirer des favoris
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  Ajouter aux favoris
                </>
              )}
            </DropdownMenuItem>
          )}
          {(!isEpisode && (watchlistId || favorisId)) && <DropdownMenuSeparator />}

          {/* Abandonner / reprendre une série de la watchlist */}
          {!isEpisode &&
            type === "serie" &&
            (inWatchlist || allowAbandonWithoutWatchlist) &&
            watchlistId && (
            <DropdownMenuItem
              onClick={() =>
                setWatchlistStatus(watchlistStatus === "abandonnee" ? "en_cours" : "abandonnee")
              }
              className="cursor-pointer"
            >
              {watchlistStatus === "abandonnee" ? (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Reprendre la série
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Abandonner la série
                </>
              )}
            </DropdownMenuItem>
          )}

          {watched ? (
            <DropdownMenuItem
              onClick={() => setConfirmDeleteOpen(true)}
              variant="destructive"
              className="cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Annuler le visionnage
            </DropdownMenuItem>
          ) : (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Check className="mr-2 h-4 w-4" />
                Marquer comme vu
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <WatchDateMenuItems
                    labelPrefix="Vu"
                    releaseDate={releaseDate}
                    showUntilHere={isEpisode}
                    onSelect={handleSelectWatchDate}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem
            onClick={() => setHistoryOpen(true)}
            className="cursor-pointer"
          >
            <HistoryIcon className="mr-2 h-4 w-4" />
            Gérer l&apos;historique de visionnage
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WatchDatePickerDialog
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
        title="Vu à une date..."
        onConfirm={(dateIso) => performMark(dateIso)}
      />

      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        watches={historyWatches}
        onDelete={(watchId) => deleteWatch.mutate(watchId)}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le visionnage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les visionnages enregistrés pour {isEpisode ? "cet épisode" : "ce titre"}{" "}
              seront supprimés.
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
