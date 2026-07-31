/**
 * Composant d'affiche de titre avec fallback.
 * Affiche l'affiche TMDB ou un placeholder si non disponible.
 * Empile en haut à gauche, sur le bord, les icones d'état pour l'utilisateur
 * connecté (dans cet ordre) : favori, watchlist, vu.
 */

import type { ReactNode } from "react";
import Image from "next/image";
import { Eye, Bookmark, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p";
const PLACEHOLDER_POSTER = "/placeholder-poster.jpg";

interface TitlePosterProps {
  src?: string | null;
  alt: string;
  title: string;
  type?: "film" | "serie";
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  watched?: boolean;
  inWatchlist?: boolean;
  inFavorites?: boolean;
}

export function TitlePoster({
  src,
  alt,
  title,
  type = "film",
  className,
  width = 300,
  height = 450,
  priority = false,
  watched = false,
  inWatchlist = false,
  inFavorites = false,
}: TitlePosterProps) {
  const imageSrc = src
    ? src.startsWith("http://") || src.startsWith("https://")
      ? src
      : `${TMDB_POSTER_BASE_URL}/w500${src}`
    : PLACEHOLDER_POSTER;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/20",
        className,
      )}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <Image
        src={imageSrc}
        alt={alt || `${title} - affiche`}
        fill
        className="object-cover transition-transform duration-300 hover:scale-105"
        priority={priority}
        sizes="(max-width: 768px) 100vw, 300px"
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMzMzMzMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMjI1IiByPSI4MCIvPjwvZz48L2c+PC9zdmc+"
      />

      {/* Badge de type (film/serie) — en bas à droite pour laisser la place,
          en haut à droite, au menu actions rapides ("⋮", rendu par TitleCard
          en dehors de ce composant). */}
      <div className="absolute bottom-2 right-2 z-10">
        <span
          className={cn(
            "px-2 py-1 text-xs font-medium rounded-full",
            type === "film"
              ? "bg-primary/10 text-primary-foreground"
              : "bg-secondary/10 text-secondary-foreground",
          )}
        >
          {type === "film" ? "Film" : "Série"}
        </span>
      </div>

      {/* Icones d'état utilisateur — empilées en haut à gauche, sur le bord :
          favori, watchlist, vu (dans cet ordre). */}
      <div className="absolute top-2 left-2 z-20 flex flex-col items-center gap-1.5">
        {inFavorites && (
          <PosterIconBadge label="Dans les favoris">
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
          </PosterIconBadge>
        )}
        {inWatchlist && (
          <PosterIconBadge label="Dans la watchlist">
            <Bookmark className="h-4 w-4 text-white fill-white" />
          </PosterIconBadge>
        )}
        {watched && (
          <PosterIconBadge label="Déjà vu">
            <Eye className="h-4 w-4 text-white fill-white" />
          </PosterIconBadge>
        )}
      </div>
    </div>
  );
}

/** Icone circulaire avec bulle d'aide au survol, pour les icones d'état sur l'affiche. */
function PosterIconBadge({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className="flex items-center justify-center rounded-full bg-black/70 p-1.5"
            aria-label={label}
          >
            {children}
          </div>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
