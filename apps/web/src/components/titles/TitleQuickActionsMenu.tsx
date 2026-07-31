/**
 * Menu contextuel rapide ("⋮") affiché sur les affiches de titres, quel que
 * soit le module (recherche, watchlist, listes, accueil, filmographie,
 * recommandations, ...). Permet d'ajouter/retirer de la watchlist et de
 * marquer comme vu (avec choix de date) / retirer de l'historique, sans
 * quitter la grille de résultats.
 *
 * Rendu en dehors du `<Link>` de la carte (élément frère positionné en
 * absolu) : un bouton ne peut pas être imbriqué dans un `<a>` (HTML
 * invalide, cf. bug #45) — voir TitleCard.tsx pour la structure.
 */

"use client";

import { MoreVertical, BookmarkPlus, BookmarkMinus, Clock, CalendarClock, HelpCircle, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useListMembership } from "@/hooks/api/useListMembership";
import { useAddItem } from "@/hooks/api/useAddItem";
import { useRemoveItem } from "@/hooks/api/useRemoveItem";
import { useCreateWatch } from "@/hooks/api/useCreateWatch";
import { useDeleteAllWatches } from "@/hooks/api/useDeleteAllWatches";
import { cn } from "@/lib/utils";

type TitleQuickActionsMenuProps = {
  titleId: string;
  inWatchlist?: boolean;
  watched?: boolean;
  className?: string;
};

export function TitleQuickActionsMenu({
  titleId,
  inWatchlist = false,
  watched = false,
  className,
}: TitleQuickActionsMenuProps) {
  const { watchlistId } = useListMembership();
  const addItem = useAddItem();
  const removeItem = useRemoveItem();
  const createWatch = useCreateWatch();
  const deleteAllWatches = useDeleteAllWatches();

  const toggleWatchlist = () => {
    if (!watchlistId) return;
    if (inWatchlist) {
      removeItem.mutate({ listId: watchlistId, titleId });
    } else {
      addItem.mutate({ listId: watchlistId, data: { title_id: titleId } });
    }
  };

  const markWatched = (date_vue?: string) => {
    createWatch.mutate({ title_id: titleId, date_vue });
  };

  const markWatchedCustomDate = () => {
    const selected = window.prompt(
      "Date du visionnage (YYYY-MM-DD) :",
      new Date().toISOString().split("T")[0],
    );
    if (selected) markWatched(new Date(selected).toISOString());
  };

  const removeFromHistory = () => {
    deleteAllWatches.mutate(titleId);
  };

  return (
    <DropdownMenu>
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
        {watchlistId && (
          <DropdownMenuItem onClick={toggleWatchlist} className="cursor-pointer">
            {inWatchlist ? (
              <>
                <BookmarkMinus className="mr-2 h-4 w-4" />
                Retirer de la watchlist
              </>
            ) : (
              <>
                <BookmarkPlus className="mr-2 h-4 w-4" />
                Ajouter à la watchlist
              </>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {watched ? (
          <DropdownMenuItem
            onClick={removeFromHistory}
            className="cursor-pointer text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Retirer de l&apos;historique
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => markWatched(new Date().toISOString())}
              className="cursor-pointer"
            >
              <Clock className="mr-2 h-4 w-4" />
              Marquer vu à l&apos;instant
            </DropdownMenuItem>
            <DropdownMenuItem onClick={markWatchedCustomDate} className="cursor-pointer">
              <CalendarClock className="mr-2 h-4 w-4" />
              Vu à une autre date...
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => markWatched(undefined)}
              className="cursor-pointer"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Vu, date inconnue
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
