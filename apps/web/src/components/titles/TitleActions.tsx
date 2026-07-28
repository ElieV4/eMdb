/**
 * Composant d'actions pour un titre (film/série).
 * Inclut : marquer vu, suivi, favori, gestion des listes, rating.
 *
 * Présentation souhaitée :
 * - ligne 1 : [vu ?] [suivi] [burger menu]
 * - ligne 2 : [rating] [favori]
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Bookmark, Heart, ListPlus, History, Trash2, Star } from "lucide-react";
import { WatchButton } from "@/components/watches/WatchButton";
import { FollowButton } from "@/components/watches/FollowButton";
import { RatingInput } from "@/components/ratings/RatingInput";
import { useUserFollows } from "@/hooks/api/useUserFollows";
import { useUserLists } from "@/hooks/api/useUserLists";
import { useAddListItem } from "@/hooks/api/useAddListItem";
import { useRemoveListItem } from "@/hooks/api/useRemoveListItem";
import { useCreateList } from "@/hooks/api/useCreateList";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

type TitleActionsProps = {
  titleId: string;
  type: "film" | "serie";
  className?: string;
};

export function TitleActions({ titleId, type, className }: TitleActionsProps) {
  const { isAuthenticated } = useAuthStore();
  const { data: follows } = useUserFollows();
  const { data: userLists } = useUserLists();
  const addListItem = useAddListItem();
  const removeListItem = useRemoveListItem();
  const createList = useCreateList();

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  if (!isAuthenticated) {
    return null;
  }

  const isFollowed = follows?.some((f) => f.title_id === titleId) ?? false;

  const favoriteList = userLists?.find((l) => l.type === "favoris");
  const watchlist = userLists?.find((l) => l.type === "watchlist");
  const customLists = userLists?.filter((l) => l.type === "custom") ?? [];

  const isInList = (listId: string) => {
    return userLists?.some((l) => l.id === listId) ?? false;
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
    const list = await createList.mutateAsync({
      nom: newListName.trim(),
      type: "custom",
    });
    setNewListName("");
    setListDialogOpen(false);
    if (list?.id) {
      await addListItem.mutateAsync({ listId: list.id, titleId });
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Ligne 1 : actions principales */}
      <div className="flex flex-wrap items-center gap-2">
        <WatchButton titleId={titleId} />
        {type === "serie" && <FollowButton titleId={titleId} initialFollowed={isFollowed} />}

        {/* Menu burger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ListPlus className="mr-2 h-4 w-4" />
                Listes
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Watchlist */}
            {watchlist && (
              <DropdownMenuItem onClick={() => handleToggleList(watchlist.id)}>
                <Check className={cn("mr-2 h-4 w-4", isInList(watchlist.id) && "text-primary")} />
                Watchlist
              </DropdownMenuItem>
            )}
            {/* Favoris */}
            {favoriteList && (
              <DropdownMenuItem onClick={() => handleToggleList(favoriteList.id)}>
                <Heart className={cn("mr-2 h-4 w-4", isInList(favoriteList.id) && "text-red-500 fill-red-500")} />
                Favoris
              </DropdownMenuItem>
            )}
            {/* Listes personnalisées */}
            {customLists.map((list) => (
              <DropdownMenuItem key={list.id} onClick={() => handleToggleList(list.id)}>
                <Check className={cn("mr-2 h-4 w-4", isInList(list.id) && "text-primary")} />
                {list.nom}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setListDialogOpen(true)}>
              <ListPlus className="mr-2 h-4 w-4" />
              Nouvelle liste
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Historique */}
        <Button variant="ghost" size="sm">
          <History className="mr-2 h-4 w-4" />
          Historique
        </Button>

        {/* Supprimer historique */}
        <Button variant="ghost" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer historique
        </Button>
      </div>

      {/* Ligne 2 : rating + favori */}
      <div className="flex flex-wrap items-center gap-3">
        <RatingInput
          value={null}
          onChange={(value) => {
            // handled by RatingInput component
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (favoriteList) {
              handleToggleList(favoriteList.id);
            }
          }}
        >
          <Heart className={cn("h-5 w-5", favoriteList && isInList(favoriteList.id) && "text-red-500 fill-red-500")} />
        </Button>
      </div>

      {/* Dialog création liste */}
      {/* TODO: intégrer ListDialog ou un formulaire inline */}
    </div>
  );
}
