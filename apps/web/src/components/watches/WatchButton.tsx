/**
 * Bouton "Marquer comme vu" avec menu contextuel (clic long).
 *
 * - Clic simple : marquer comme vu à l'instant.
 * - Clic long (>500ms) : menu avec options :
 *   - Vu maintenant
 *   - Vu à la date de sortie
 *   - Vu à une date personnalisée
 *   - Date inconnue
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Clock, CalendarClock, HelpCircle } from "lucide-react";

type WatchButtonProps = {
  titleId?: string;
  episodeId?: string;
  className?: string;
};

type WatchAction = "now" | "release" | "custom" | "unknown";

export function WatchButton({ titleId, episodeId, className }: WatchButtonProps) {
  const [open, setOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createWatch = useCreateWatch();

  const handleClick = useCallback(() => {
    if (open) return;
    createWatch.mutate(
      { title_id: titleId, episode_id: episodeId, date_vue: undefined },
      { onSuccess: () => setOpen(false) }
    );
  }, [createWatch, episodeId, open, titleId]);

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
      } else if (action === "release") {
        date_vue = undefined;
      } else if (action === "custom") {
        const selected = window.prompt(
          "Date du visionnage (YYYY-MM-DD) :",
          new Date().toISOString().split("T")[0]
        );
        if (selected) date_vue = new Date(selected).toISOString();
      } else {
        date_vue = undefined;
      }

      createWatch.mutate(
        { title_id: titleId, episode_id: episodeId, date_vue },
        { onSuccess: () => setOpen(false) }
      );
    },
    [createWatch, episodeId, titleId]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <Button
          className={className}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleLongPressEnd}
          onClick={handleClick}
        >
          <Check className="mr-2 h-4 w-4" />
          Marquer comme vu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleSelect("now")}
          className="cursor-pointer"
        >
          <Clock className="mr-2 h-4 w-4" />
          <span>À l'instant</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("release")}
          className="cursor-pointer"
          disabled
        >
          <CalendarClock className="mr-2 h-4 w-4" />
          <span>À la date de sortie</span>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}