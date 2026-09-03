/**
 * Composant d'actions pour un titre (film/série).
 * Inclut : marquer vu, suivi, favori, gestion des listes, rating, historique.
 *
 * Présentation souhaitée :
 * - ligne 1 : [vu ?] [suivi (série)] [burger menu]
 * - ligne 2 : [rating] [favori]
 *
 * Le burger contient :
 * - Gérer les listes (watchlist, favoris, custom + nouvelle liste)
 * - Voir l'historique
 * - Supprimer l'historique
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, Heart, ListPlus, History, Loader2, Archive, ArchiveRestore } from "lucide-react";
import { WatchButton } from "@/components/watches/WatchButton";
import { HistoryDialog } from "@/components/watches/HistoryDialog";
import { FollowButton } from "@/components/watches/FollowButton";
import { RatingInput } from "@/components/ratings/RatingInput";
import { useUserFollows } from "@/hooks/api/useUserFollows";
import { useUserLists } from "@/hooks/api/useUserLists";
import { useListMembership } from "@/hooks/api/useListMembership";
import { useAddListItem } from "@/hooks/api/useAddListItem";
import { useRemoveListItem } from "@/hooks/api/useRemoveListItem";
import { useCreateList } from "@/hooks/api/useCreateList";
import { useUpdateListItemStatus } from "@/hooks/api/useUpdateListItemStatus";
import { useUpsertRating } from "@/hooks/api/useUpsertRating";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { useUpdateWatchContext } from "@/hooks/api/useUpdateWatchContext";
import { useTitleRatingsSummary } from "@/hooks/api/useTitleRatingsSummary";
import { useWatches } from "@/hooks/api/useWatches";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

type TitleActionsProps = {
  titleId: string;
  type: "film" | "serie";
  releaseDate?: string | null;
  className?: string;
};

export function TitleActions({ titleId, type, releaseDate, className }: TitleActionsProps) {
  const { isAuthenticated } = useAuthStore();
  const { data: follows } = useUserFollows();
  const { data: userLists } = useUserLists(titleId);
  const { watchlistStatuses } = useListMembership();
  const { data: ratingsSummary } = useTitleRatingsSummary(titleId);
  const { data: watchesData } = useWatches({ title_id: titleId, limit: 50 });
  const queryClient = useQueryClient();
  const addListItem = useAddListItem();
  const removeListItem = useRemoveListItem();
  const createList = useCreateList();
  const updateItemStatus = useUpdateListItemStatus();
  const upsertRating = useUpsertRating();
  const deleteWatch = useDeleteWatch();
  const updateWatchContext = useUpdateWatchContext();
  const watches = watchesData?.items ?? [];
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showCreateList, setShowCreateList] = useState(false);

  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (user?.id && user.id !== prevUserId.current) {
      prevUserId.current = user.id;
    }
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  const isFollowed = follows?.some((f) => f.title_id === titleId) ?? false;

  const favoriteList = userLists?.find((l) => l.type === "favoris");
  const watchlist = userLists?.find((l) => l.type === "watchlist");
  const customLists = userLists?.filter((l) => l.type === "custom") ?? [];
  const listsContainingTitle = (userLists ?? []).filter((l) => l.contains_title).length;

  const isInList = (listId: string) => {
    const list = userLists?.find((l) => l.id === listId);
    return list?.contains_title ?? false;
  };

  const handleToggleList = async (listId: string) => {
    if (isInList(listId)) {
      await removeListItem.mutateAsync({ listId, titleId });
    } else {
      await addListItem.mutateAsync({ listId, titleId });
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const list = (await createList.mutateAsync({
      nom: newListName.trim(),
      type: "custom",
    })) as { id?: string } | undefined;
    setNewListName("");
    setShowCreateList(false);
    if (list?.id) {
      await addListItem.mutateAsync({ listId: list.id, titleId });
    }
  };

  const handleWatchChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
  };

  const handleUnwatch = async (watchId: string) => {
    await deleteWatch.mutateAsync(watchId);
  };

  const watchlistStatus = watchlistStatuses.get(titleId);

  const handleToggleAbandon = async () => {
    if (!watchlist) return;
    if (!isInList(watchlist.id)) {
      await addListItem.mutateAsync({ listId: watchlist.id, titleId });
    }
    updateItemStatus.mutate({
      listId: watchlist.id,
      titleId,
      statut: watchlistStatus === "abandonnee" ? "en_cours" : "abandonnee",
    });
  };

  const handleToggleFavorite = async () => {
    if (!favoriteList) return;
    if (isInList(favoriteList.id)) {
      await removeListItem.mutateAsync({ listId: favoriteList.id, titleId });
    } else {
      await addListItem.mutateAsync({ listId: favoriteList.id, titleId });
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Ligne 1 : vu / suivi / burger — icônes seules, tient sous l'affiche */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {type === "film" && (
          <WatchButton
            titleId={titleId}
            releaseDate={releaseDate}
            watches={watches}
            onChanged={handleWatchChanged}
            compact
          />
        )}
        {type === "serie" && (
          <FollowButton titleId={titleId} initialFollowed={isFollowed} compact />
        )}

        {/* Menu burger */}
        <div className="relative inline-block">
        <DropdownMenu>
          {/* `render` fusionne le déclencheur du menu sur CE bouton au lieu
              d'imbriquer un <button> dans un autre <button> (HTML invalide qui
              empêchait le clic d'ouvrir le menu, bug #45). */}
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon" aria-label="Listes">
                <ListPlus className="h-4 w-4" />
              </Button>
            }
          />
          {/* Étiquette rouge : nombre de listes contenant ce titre — sibling
              du bouton, positionnée en absolu (même contrainte que le menu
              actions rapides, un badge ne peut pas être imbriqué dans le
              <button> ci-dessus proprement sans casser sa mise en page). */}
          {listsContainingTitle > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white"
              aria-label={`Dans ${listsContainingTitle} liste${listsContainingTitle > 1 ? "s" : ""}`}
            >
              {listsContainingTitle}
            </span>
          )}
          <DropdownMenuContent align="end" className="w-56">
            {/* Watchlist */}
            {watchlist && (
              <DropdownMenuItem onClick={() => handleToggleList(watchlist.id)}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    isInList(watchlist.id) && "text-primary",
                  )}
                />
                Watchlist
              </DropdownMenuItem>
            )}
            {/* Abandonner / reprendre une série de la watchlist */}
            {type === "serie" && watchlist && (
              <DropdownMenuItem onClick={handleToggleAbandon}>
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
            {/* Favoris */}
            {favoriteList && (
              <DropdownMenuItem
                onClick={() => handleToggleList(favoriteList.id)}
              >
                <Heart
                  className={cn(
                    "mr-2 h-4 w-4",
                    isInList(favoriteList.id) && "text-red-500 fill-red-500",
                  )}
                />
                Favoris
              </DropdownMenuItem>
            )}
            {/* Listes personnalisées */}
            {customLists.map((list) => (
              <DropdownMenuItem
                key={list.id}
                onClick={() => handleToggleList(list.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    isInList(list.id) && "text-primary",
                  )}
                />
                {list.nom}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCreateList(true)}>
              <ListPlus className="mr-2 h-4 w-4" />
              Nouvelle liste
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {/* Historique */}
        <Button variant="ghost" size="icon" aria-label="Historique" onClick={() => setHistoryOpen(true)}>
          <History className="h-4 w-4" />
        </Button>
      </div>

      {/* Ligne 2 : rating + favori */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <RatingInput
          size="sm"
          value={ratingsSummary?.moyenne ?? null}
          onChange={(value) =>
            upsertRating.mutate({ title_id: titleId, note_perso: value })
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Favoris"
          onClick={handleToggleFavorite}
          disabled={!favoriteList}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              favoriteList &&
                isInList(favoriteList.id) &&
                "text-red-500 fill-red-500",
            )}
          />
        </Button>
      </div>

      {/* Dialog historique */}
      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        watches={watches}
        onDelete={handleUnwatch}
        onUpdateContext={(watchId, patch) => updateWatchContext.mutate({ watchId, data: patch })}
      />

      {/* Dialog création liste */}
      {showCreateList && (
        <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle liste</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Nom de la liste"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateList();
                }}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateList(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={createList.isPending}
              >
                {createList.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
