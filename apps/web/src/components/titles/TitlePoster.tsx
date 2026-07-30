/**
 * Composant d'affiche de titre avec fallback.
 * Affiche l'affiche TMDB ou un placeholder si non disponible.
 * Affiche une icone bookmark (haut) si la série est suivie, et une icone œil rouge (bas) si le titre est vu.
 */

import Image from "next/image";
import { Eye, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

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
  followed?: boolean;
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
  followed = false,
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

      {/* Badge de type (film/serie) */}
      <div className="absolute top-2 left-2 z-10">
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

      {/* Icone bookmark (série suivie) — milieu haut */}
      {followed && (
        <div className="absolute top-2 right-2 z-20 flex items-center justify-center rounded-full bg-black/70 p-1.5">
          <Bookmark
            className="h-4 w-4 text-white fill-white"
            aria-label="Série suivie"
          />
        </div>
      )}

      {/* Icone vu (œil rouge) — milieu bas */}
      {watched && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center rounded-full bg-black/70 p-1.5">
          <Eye
            className="h-4 w-4 text-red-500 fill-red-500"
            aria-label="Déjà vu"
          />
        </div>
      )}
    </div>
  );
}
