/**
 * Carte de titre (film ou série) pour les résultats de recherche et grilles.
 * Affiche l'affiche, le titre, la note, l'année et le type.
 */

import Link from "next/link";
import { Star } from "lucide-react";
import { TitlePoster } from "./TitlePoster";
import { TitleSearchResult } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface TitleCardProps {
  title: TitleSearchResult;
  className?: string;
  showType?: boolean;
  compact?: boolean;
  watched?: boolean;
  followed?: boolean;
}

export function TitleCard({
  title,
  className,
  showType = true,
  compact = false,
  watched = false,
  followed = false,
}: TitleCardProps) {
  const {
    id,
    titre,
    titreOriginal,
    type,
    dateSortie,
    note,
    afficheUrl,
    local,
  } = title;

  // Extraire l'année de la date de sortie
  const year = dateSortie ? new Date(dateSortie).getFullYear() : null;
  const displayTitle =
    titreOriginal && titreOriginal !== titre ? titreOriginal : titre;

  const href = local
    ? `/titles/${id}`
    : `/titles/tmdb/${title.tmdbId}?type=${type}`;

  return (
    <Link
      href={href}
      className={cn(
        "group block overflow-hidden rounded-lg transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <TitlePoster
        src={afficheUrl}
        alt={titre}
        title={titre}
        type={type}
        width={compact ? 150 : 200}
        height={compact ? 225 : 300}
        priority={false}
        watched={watched}
        followed={followed}
      />

      <div className="p-3 bg-background">
        <div className="space-y-1">
          {/* Titre */}
          <h3
            className={cn(
              "font-semibold line-clamp-1 group-hover:text-primary",
              compact ? "text-sm" : "text-base",
            )}
          >
            {displayTitle}
          </h3>

          {/* Titre original si différent */}
          {titreOriginal && titreOriginal !== titre && !compact && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {titre}
            </p>
          )}

          {/* Métadonnées (année, note) */}
          <div className="flex items-center gap-2 text-sm">
            {year && <span className="text-muted-foreground">{year}</span>}

            {note && (
              <span className="flex items-center gap-0.5 text-amber-400">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{Number(note).toFixed(1)}</span>
              </span>
            )}

            {showType && !compact && (
              <span
                className={cn(
                  "px-1.5 py-0.5 text-xs font-medium rounded-full",
                  type === "film"
                    ? "bg-primary/10 text-primary-foreground"
                    : "bg-secondary/10 text-secondary-foreground",
                )}
              >
                {type === "film" ? "Film" : "Série"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Variante pour afficher dans une liste (horizontal)
export function TitleCardHorizontal({
  title,
  className,
  watched = false,
  followed = false,
}: Omit<TitleCardProps, "compact">) {
  const {
    id,
    titre,
    titreOriginal,
    type,
    dateSortie,
    note,
    afficheUrl,
    local,
  } = title;
  const year = dateSortie ? new Date(dateSortie).getFullYear() : null;

  const href = local
    ? `/titles/${id}`
    : `/titles/tmdb/${title.tmdbId}?type=${type}`;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg transition-all duration-200",
        "hover:bg-muted/50",
        className,
      )}
    >
      <TitlePoster
        src={afficheUrl}
        alt={titre}
        title={titre}
        type={type}
        width={80}
        height={120}
        className="shrink-0"
        watched={watched}
        followed={followed}
      />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary">
          {titre}
        </h3>
        {titreOriginal && titreOriginal !== titre && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {titreOriginal}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {year && <span>{year}</span>}
          {note && (
            <span className="flex items-center gap-0.5 text-amber-400">
              <Star className="h-3 w-3 fill-current" />
              {Number(note).toFixed(1)}
            </span>
          )}
          <span
            className={cn(
              "px-1.5 py-0.5 text-xs font-medium rounded-full",
              type === "film"
                ? "bg-primary/10 text-primary-foreground"
                : "bg-secondary/10 text-secondary-foreground",
            )}
          >
            {type === "film" ? "Film" : "Série"}
          </span>
        </div>
      </div>
    </Link>
  );
}
