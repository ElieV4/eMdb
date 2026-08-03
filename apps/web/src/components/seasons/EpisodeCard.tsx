/**
 * Card épisode pour les écrans mobiles.
 * Version compacte de EpisodeRow.
 */

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EpisodeRowItem } from "./EpisodeRow";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

interface EpisodeCardProps {
  episode: EpisodeRowItem;
  titleId: string;
  seasonNumero: number;
  isWatched?: boolean;
  className?: string;
}

export function EpisodeCard({
  episode,
  titleId: _titleId,
  seasonNumero: _seasonNumero,
  isWatched = false,
  className,
}: EpisodeCardProps) {
  const { numero, date_sortie, duree_minutes, image_url } = episode;
  const titre = episode.titre || `Épisode ${numero}`;
  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;

  return (
    <Link
      href={`/episodes/${episode.id}`}
      className={cn(
        "group block rounded-lg border bg-muted/30 overflow-hidden transition-all duration-200",
        "hover:shadow-md",
        className,
      )}
    >
      {/* Image */}
      <div className="relative h-32 w-full">
        {image_url ? (
          <Image
            src={`${TMDB_IMAGE_BASE_URL}/w300${image_url}`}
            alt={titre}
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Pas image</span>
          </div>
        )}

        {/* Badge numéro */}
        <div className="absolute top-2 left-2">
          <span
            className={cn(
              "px-2 py-1 text-xs font-medium rounded-full",
              isWatched
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            E{numero}
          </span>
        </div>
      </div>

      {/* Infos */}
      <div className="p-3 space-y-2">
        <h4 className="text-sm font-medium line-clamp-1 group-hover:text-primary">
          {titre}
        </h4>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {year}
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
    </Link>
  );
}
