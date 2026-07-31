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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, Heart, ListPlus, History, Trash2, Loader2 } from "lucide-react";
import { WatchButton } from "@/components/watches/WatchButton";
import { FollowButton } from "@/components/watches/FollowButton";
import { RatingInput } from "@/components/ratings/RatingInput";
import { useUserFollows } from "@/hooks/api/useUserFollows";
import { useUserLists } from "@/hooks/api/useUserLists";
import { useAddListItem } from "@/hooks/api/useAddListItem";
import { useRemoveListItem } from "@/hooks/api/useRemoveListItem";
import { useCreateList } from "@/hooks/api/useCreateList";
import { useUpsertRating } from "@/hooks/api/useUpsertRating";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { useDeleteAllWatches } from "@/hooks/api/useDeleteAllWatches";
import { useTitleRatingsSummary } from "@/hooks/api/useTitleRatingsSummary";
import { useWatches } from "@/hooks/api/useWatches";
import { UserWatch } from "@/lib/types/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

type TitleActionsProps = {
  titleId: string;
  type: "film" | "serie";
  className?: string;
};

type WatchEntry = UserWatch;

function WatchHistoryDialog({
  open,
  onOpenChange,
  watches,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watches: WatchEntry[];
  onDelete: (watchId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historique de visionnage</DialogTitle>
          <DialogDescription>
            Visionnages enregistrés pour ce titre.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {watches.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun visionnage pour ce titre.
            </p>
          )}
          {watches.map((watch: WatchEntry) => (
            <div
              key={watch.id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {watch.episodes
                    ? `Épisode ${watch.episodes.numero}${watch.episodes.titre ? ` - ${watch.episodes.titre}` : ""}`
                    : watch.titles?.titre_vf ||
                      watch.titles?.titre_vo ||
                      "Titre"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(watch.date_vue).toLocaleString("fr-FR")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(watch.id)}
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

export function TitleActions({ titleId, type, className }: TitleActionsProps) {
  const { isAuthenticated } = useAuthStore();
  const { data: follows } = useUserFollows();
  const { data: userLists } = useUserLists(titleId);
  const { data: ratingsSummary } = useTitleRatingsSummary(titleId);
  const { data: watchesData } = useWatches({ title_id: titleId, limit: 50 });
  const queryClient = useQueryClient();
  const addListItem = useAddListItem();
  const removeListItem = useRemoveListItem();
  const createList = useCreateList();
  const upsertRating = useUpsertRating();
  const deleteWatch = useDeleteWatch();
  const deleteAllWatches = useDeleteAllWatches();

  const watches = watchesData?.items ?? [];
  const watchCount = watches.length;
  const isWatched = watches.length > 0;
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

  const handleWatchSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
  };

  const handleUnwatch = async (watchId: string) => {
    await deleteWatch.mutateAsync(watchId);
  };

  const handleDeleteAll = () => {
    deleteAllWatches.mutate(titleId, {
      onSuccess: () => {
        handleWatchSuccess();
      },
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
    <div className={cn("space-y-3", className)}>
      {/* Ligne 1 : vu / suivi / burger */}
      <div className="flex flex-wrap items-center gap-2">
        {type === "film" && (
          <WatchButton
            titleId={titleId}
            onWatchSuccess={handleWatchSuccess}
            watched={isWatched}
            watchCount={watchCount}
            onDeleteAll={handleDeleteAll}
          />
        )}
        {type === "serie" && (
          <FollowButton titleId={titleId} initialFollowed={isFollowed} />
        )}

        {/* Menu burger */}
        <DropdownMenu>
          {/* `render` fusionne le déclencheur du menu sur CE bouton au lieu
              d'imbriquer un <button> dans un autre <button> (HTML invalide qui
              empêchait le clic d'ouvrir le menu, bug #45). */}
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <ListPlus className="mr-2 h-4 w-4" />
                Listes
              </Button>
            }
          />
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

        {/* Historique */}
        <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
          <History className="mr-2 h-4 w-4" />
          Historique
        </Button>
      </div>

      {/* Ligne 2 : rating + favori */}
      <div className="flex flex-wrap items-center gap-3">
        <RatingInput
          value={ratingsSummary?.moyenne ?? null}
          onChange={(value) =>
            upsertRating.mutate({ title_id: titleId, note_perso: value })
          }
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleFavorite}
          disabled={!favoriteList}
        >
          <Heart
            className={cn(
              "h-5 w-5",
              favoriteList &&
                isInList(favoriteList.id) &&
                "text-red-500 fill-red-500",
            )}
          />
        </Button>
      </div>

      {/* Dialog historique */}
      <WatchHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        watches={watches}
        onDelete={handleUnwatch}
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
