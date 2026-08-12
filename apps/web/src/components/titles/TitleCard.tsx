/**
 * Carte de titre (film ou série) pour les résultats de recherche et grilles.
 * Affiche l'affiche, le titre, la note, l'année et le type.
 */

import Link from "next/link";
import { Star } from "lucide-react";
import { TitlePoster } from "./TitlePoster";
import { TitleQuickActionsMenu } from "./TitleQuickActionsMenu";
import { TitleWatchedButton } from "./TitleWatchedButton";
import { TitleSearchResult } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface TitleCardProps {
  title: TitleSearchResult;
  className?: string;
  showType?: boolean;
  compact?: boolean;
  watched?: boolean;
  inWatchlist?: boolean;
  inFavorites?: boolean;
  /** Statut de progression dans la watchlist ("en_cours" / "a_jour" / "abandonnee"). */
  watchlistStatus?: "en_cours" | "a_jour" | "abandonnee";
}

export function TitleCard({
  title,
  className,
  showType = true,
  compact = false,
  watched = false,
  inWatchlist = false,
  inFavorites = false,
  watchlistStatus,
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

  const posterWidth = compact ? 150 : 200;

  return (
    // Largeur alignée sur celle de l'affiche : sans ça, le wrapper (bloc)
    // s'étire à la largeur de la cellule de grille, et le bouton "⋮"
    // positionné en absolu par rapport à lui atterrit hors de l'affiche.
    <div
      className={cn("group relative", className)}
      style={{ width: `${posterWidth}px` }}
    >
      {/* Le menu actions rapides est un bouton — il ne peut pas être imbriqué
          dans le <Link> ci-dessous (HTML invalide, cf. bug #45), donc il est
          rendu en frère, positionné par-dessus. */}
      <TitleQuickActionsMenu
        titleId={id}
        tmdbId={title.tmdbId}
        type={type}
        local={local}
        releaseDate={dateSortie}
        inWatchlist={inWatchlist}
        inFavorites={inFavorites}
        watched={watched}
        watchlistStatus={watchlistStatus}
        className="absolute top-2 right-2 z-30"
      />
      {/* Mini bouton "marquer comme vu" — sous le coin bas droit de
          l'affiche, en sibling du `Link` pour la même raison que le menu
          actions rapides ci-dessus. */}
      <TitleWatchedButton
        titleId={id}
        tmdbId={title.tmdbId}
        type={type}
        local={local}
        watched={watched}
        className="absolute z-20"
        style={{ top: `${posterWidth * 1.5}px`, right: "8px", transform: "translateY(-50%)" }}
      />
      <Link
        href={href}
        className={cn(
          "block overflow-hidden rounded-lg transition-all duration-200",
          "hover:shadow-md hover:-translate-y-0.5",
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
          inWatchlist={inWatchlist}
          inFavorites={inFavorites}
          watchlistStatus={watchlistStatus}
        />

        <div className="p-3 bg-background">
          <div className="space-y-1">
            {/* Titre — mêmes classes que DateCard/ContinueWatchingCard (uniformisation
                typographique demandée par l'utilisateur, référence : cartes épisode du calendrier) */}
            <h3 className="text-sm font-medium line-clamp-1 group-hover:text-primary">
              {displayTitle}
            </h3>

            {/* Titre original si différent */}
            {titreOriginal && titreOriginal !== titre && !compact && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {titre}
              </p>
            )}

            {/* Métadonnées (année, note) */}
            <div className="flex items-center gap-2 text-xs">
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
    </div>
  );
}

// Variante pour afficher dans une liste (horizontal)
export function TitleCardHorizontal({
  title,
  className,
  watched = false,
  inWatchlist = false,
  inFavorites = false,
  watchlistStatus,
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
    <div className={cn("group relative", className)}>
      {/* Positionné sur le coin de l'affiche (80px de large) — bouton, donc
          rendu hors du <Link> ci-dessous, cf. TitleCard. */}
      <TitleQuickActionsMenu
        titleId={id}
        tmdbId={title.tmdbId}
        type={type}
        local={local}
        releaseDate={dateSortie}
        inWatchlist={inWatchlist}
        inFavorites={inFavorites}
        watched={watched}
        watchlistStatus={watchlistStatus}
        className="absolute top-1 left-[52px] z-30"
      />
      <Link
        href={href}
        className="flex items-center gap-4 p-3 rounded-lg transition-all duration-200 hover:bg-muted/50"
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
          inWatchlist={inWatchlist}
          inFavorites={inFavorites}
          watchlistStatus={watchlistStatus}
        />

        <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium line-clamp-1 group-hover:text-primary">
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
    </div>
  );
}
