/**
 * Version compacte d'une saison pour affichage dans la page détail d'une série.
 * Affiche les informations essentielles et permet de développer pour voir les épisodes.
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, PlayCircle, CheckCircle2 } from "lucide-react";
import { SeasonSummary } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { EpisodeSnapshot } from "./EpisodeSnapshot";

interface SeasonCompactProps {
  season: SeasonSummary;
  titleId: string;
  /** Progression de visionnage de cette saison (vus/total) — omise si
   * l'utilisateur n'est pas connecté ou si la progression n'a pas encore
   * chargé, auquel cas on retombe sur le nombre d'épisodes seul. */
  progress?: { vus: number; total: number };
  className?: string;
}

export function SeasonCompact({
  season,
  titleId,
  progress,
  className,
}: SeasonCompactProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { numero, titre, date_sortie, nombre_episodes } = season;
  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;
  const isFullyWatched = !!progress && progress.total > 0 && progress.vus >= progress.total;

  return (
    <div
      className={cn("rounded-lg border bg-muted/30 overflow-hidden", className)}
    >
      {/* Header de la saison - toujours visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            isFullyWatched ? "bg-primary/20" : "bg-primary/10",
          )}
        >
          {isFullyWatched ? (
            <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Saison entièrement vue" />
          ) : (
            <PlayCircle className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <h3 className="font-semibold">{titre || `Saison ${numero}`}</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {progress ? `${progress.vus}/${progress.total}` : nombre_episodes} épisode(s)
            </span>
            {year && <span>{year}</span>}
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Liste des épisodes - affichée seulement si expandée */}
      {isExpanded && (
        <div className="border-t bg-background/50 p-4">
          <EpisodeSnapshot
            titleId={titleId}
            seasonNumber={numero}
            seasonId={season.id}
          />
        </div>
      )}
    </div>
  );
}
