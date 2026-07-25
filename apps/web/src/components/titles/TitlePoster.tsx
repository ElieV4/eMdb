/**
 * Composant d'affiche de titre avec fallback.
 * Affiche l'affiche TMDB ou un placeholder si non disponible.
 */

import Image from "next/image";
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
}: TitlePosterProps) {
  // Utiliser l'URL TMDB si disponible, sinon le placeholder
  const imageSrc = src
    ? `${TMDB_POSTER_BASE_URL}/w500${src}`
    : PLACEHOLDER_POSTER;

  // Ratio d'aspect : 2:3 pour les affiches de films
  const aspectRatio = width / height;

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
    </div>
  );
}
