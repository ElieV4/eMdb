/**
 * Card pour une saison dans la grille des saisons d'une série.
 * Affiche le numéro, le titre, le nombre d'épisodes et la date de sortie.
 */

import Link from "next/link";
import { Calendar, PlayCircle } from "lucide-react";
import { SeasonSummary } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface SeasonCardProps {
  season: SeasonSummary;
  titleId: string;
  className?: string;
}

export function SeasonCard({ season, titleId, className }: SeasonCardProps) {
  const { numero, titre, date_sortie, nombre_episodes } = season;
  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;

  return (
    <Link
      href={`/series/${titleId}/seasons/${numero}`}
      className={cn(
        "group block rounded-lg border bg-muted/30 p-4 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <PlayCircle className="h-6 w-6 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold group-hover:text-primary">
            {titre || `Saison ${numero}`}
          </h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{nombre_episodes} épisode(s)</span>
            {year && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {year}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
