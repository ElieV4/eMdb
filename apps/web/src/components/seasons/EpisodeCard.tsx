/**
 * Card épisode pour les écrans mobiles.
 * Version compacte de EpisodeRow.
 */

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EpisodeRowItem } from "./EpisodeRow";
import { TitleWatchedButton } from "@/components/titles/TitleWatchedButton";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const IMAGE_HEIGHT = 128; // h-32

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
  const dateStr = date_sortie
    ? new Date(date_sortie).toLocaleDateString("fr-FR")
    : null;

  return (
    <div
      className={cn("group relative rounded-lg border bg-muted/30 overflow-hidden", className)}
    >
      {/* Boutons d'action — sibling du <Link> ci-dessous : un bouton ne peut
          pas être imbriqué dans un <a> (HTML invalide, cf. bug #45), même
          convention que TitleCard/ContinueWatchingCard. */}
      <Link
        href={`/episodes/${episode.id}`}
        className="absolute top-1.5 right-1.5 z-30 flex items-center justify-center rounded-full bg-black/70 p-1.5 hover:bg-black/90 transition-colors"
        aria-label="Voir la page de l'épisode"
        title="Voir la page de l'épisode"
      >
        <Plus className="h-4 w-4 text-white" />
      </Link>
      <TitleWatchedButton
        episodeId={episode.id}
        watched={isWatched}
        className="absolute z-20"
        style={{ top: `${IMAGE_HEIGHT}px`, right: "8px", transform: "translateY(-50%)" }}
      />

      <Link
        href={`/episodes/${episode.id}`}
        className="block transition-all duration-200 hover:shadow-md"
      >
        {/* Image */}
        <div className="relative w-full" style={{ height: `${IMAGE_HEIGHT}px` }}>
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
            {dateStr && (
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
      </Link>
    </div>
  );
}
