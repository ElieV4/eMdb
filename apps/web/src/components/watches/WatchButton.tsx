/**
 * Bouton "Marquer comme vu" avec menu contextuel (clic long).
 *
 * - Clic simple : marquer comme vu à l'instant.
 * - Clic long (>500ms) : menu avec options :
 *   - Vu maintenant
 *   - Vu à une date personnalisée
 *   - Date inconnue
 *
 * État "Vu" :
 * - Affiche "Vu" ou "Vu x3" si plusieurs visionnages
 * - Clic simple : marque "revu" (date actuelle)
 * - Menu : "Revu" avec options, "Annuler le visionnage" (supprime tout)
 *
 * Phase 4.1 — Watches
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { useCreateWatch } from "@/hooks/api/useCreateWatch";
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
import {
  Check,
  Clock,
  CalendarClock,
  HelpCircle,
  Trash2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WatchButtonProps = {
  titleId?: string;
  episodeId?: string;
  className?: string;
  onWatchSuccess?: () => void;
  watched?: boolean;
  watchCount?: number;
  onDeleteAll?: () => void;
};

type WatchAction = "now" | "custom" | "unknown" | "unwatch";

export function WatchButton({
  titleId,
  episodeId,
  className,
  onWatchSuccess,
  watched = false,
  watchCount = 0,
  onDeleteAll,
}: WatchButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createWatch = useCreateWatch();

  const handleClick = useCallback(() => {
    if (open) return;
    if (watched) {
      // Revu maintenant
      createWatch.mutate(
        {
          title_id: episodeId ? undefined : titleId,
          episode_id: episodeId,
          date_vue: new Date().toISOString(),
        },
        {
          onSuccess: () => {
            setOpen(false);
            onWatchSuccess?.();
          },
        },
      );
      return;
    }
    createWatch.mutate(
      {
        title_id: episodeId ? undefined : titleId,
        episode_id: episodeId,
        date_vue: undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          onWatchSuccess?.();
        },
      },
    );
  }, [createWatch, episodeId, onWatchSuccess, open, titleId, watched]);

  const handleLongPressStart = useCallback(() => {
    pressTimer.current = setTimeout(() => {
      setOpen(true);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleSelect = useCallback(
    (action: WatchAction) => {
      let date_vue: string | undefined;

      if (action === "now") {
        date_vue = new Date().toISOString();
      } else if (action === "custom") {
        const selected = window.prompt(
          "Date du visionnage (YYYY-MM-DD) :",
          new Date().toISOString().split("T")[0],
        );
        if (selected) date_vue = new Date(selected).toISOString();
      } else if (action === "unwatch") {
        setConfirmOpen(true);
        return;
      } else {
        date_vue = undefined;
      }

      if (date_vue !== undefined || action === "unknown") {
        createWatch.mutate(
          {
            title_id: episodeId ? undefined : titleId,
            episode_id: episodeId,
            date_vue,
          },
          {
            onSuccess: () => {
              setOpen(false);
              onWatchSuccess?.();
            },
          },
        );
      }
    },
    [createWatch, episodeId, onWatchSuccess, titleId],
  );

  const handleConfirmDelete = useCallback(() => {
    setConfirmOpen(false);
    setOpen(false);
    onDeleteAll?.();
  }, [onDeleteAll]);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger>
          <Button
            className={cn(
              className,
              watched && "bg-primary text-primary-foreground",
            )}
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
            onClick={handleClick}
          >
            {watched ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                {watchCount > 1 ? `Vu x${watchCount}` : "Vu"}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Marquer comme vu
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!watched ? (
            <>
              <DropdownMenuItem
                onClick={() => handleSelect("now")}
                className="cursor-pointer"
              >
                <Clock className="mr-2 h-4 w-4" />
                <span>À l'instant</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSelect("custom")}
                className="cursor-pointer"
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                <span>Autre date...</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSelect("unknown")}
                className="cursor-pointer"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Date inconnue</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => handleSelect("now")}
                className="cursor-pointer"
              >
                <Clock className="mr-2 h-4 w-4" />
                <span>Revu à l'instant</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSelect("custom")}
                className="cursor-pointer"
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                <span>Revu autre date...</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSelect("unknown")}
                className="cursor-pointer"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Revu date inconnue</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleSelect("unwatch")}
                className="cursor-pointer text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Annuler le visionnage</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'annulation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer tous les visionnages de ce
              titre&nbsp;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Supprimer tout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
