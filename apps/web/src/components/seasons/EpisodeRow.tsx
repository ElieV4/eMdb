/**
 * Ligne d'épisode pour le tableau des épisodes d'une saison.
 * Affiche le numéro, le still, le titre, la date, la durée et les boutons d'action.
 */

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type EpisodeRowItem = {
  id: string;
  numero: number;
  titre?: string | null;
  synopsis?: string | null;
  date_sortie?: string | null;
  duree_minutes?: number | null;
  image_url?: string | null;
};

interface EpisodeRowProps {
  episode: EpisodeRowItem;
  titleId: string;
  seasonNumero: number;
  isWatched?: boolean;
  className?: string;
}

export function EpisodeRow({
  episode,
  titleId: _titleId,
  seasonNumero,
  isWatched = false,
  className,
}: EpisodeRowProps) {
  const { numero, date_sortie, duree_minutes, image_url } = episode;
  const titre = episode.titre || `Épisode ${numero}`;
  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;
  const dateStr = date_sortie
    ? new Date(date_sortie).toLocaleDateString("fr-FR")
    : null;

  return (
    <Link
      href={`/episodes/${episode.id}`}
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg transition-colors duration-200",
        "hover:bg-muted/50",
        className,
      )}
    >
      {/* Still / placeholder */}
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded">
        {image_url ? (
          <Image
            src={`${TMDB_IMAGE_BASE_URL}/w92${image_url}`}
            alt={titre}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Pas image</span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            S{seasonNumero} E{numero.toString().padStart(2, "0")}
          </span>
          <span
            className={cn(
              "text-sm font-medium",
              isWatched ? "text-primary" : "text-foreground",
            )}
          >
            {titre}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          {year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </span>
          )}
          {duree_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duree_minutes} min
            </span>
          )}
        </div>
      </div>

      {/* Statut vu */}
      <div className="flex items-center justify-center">
        {isWatched ? (
          <CheckCircle2
            className="h-5 w-5 text-primary"
            data-testid="check-icon"
          />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>
    </Link>
  );
}
