/**
 * Version compacte d'une saison pour affichage dans la page détail d'une série.
 * Affiche les informations essentielles et permet de développer pour voir les épisodes.
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { SeasonSummary } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { EpisodeSnapshot } from "./EpisodeSnapshot";

interface SeasonCompactProps {
  season: SeasonSummary;
  titleId: string;
  className?: string;
}

export function SeasonCompact({
  season,
  titleId,
  className,
}: SeasonCompactProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { numero, titre, date_sortie, nombre_episodes } = season;
  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;

  return (
    <div
      className={cn("rounded-lg border bg-muted/30 overflow-hidden", className)}
    >
      {/* Header de la saison - toujours visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <PlayCircle className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <h3 className="font-semibold">{titre || `Saison ${numero}`}</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{nombre_episodes} épisode(s)</span>
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
