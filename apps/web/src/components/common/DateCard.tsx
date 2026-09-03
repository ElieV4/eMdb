/**
 * Carte compacte (vignette + titre) — badge de date relative superposé en
 * bas à droite. Utilisée par les sliders horizontaux Historique/Calendrier
 * de l'accueil et par les grilles des pages dédiées /history et /calendar
 * (modification J, puis retour "garde le format affiche").
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { X, Eye, Bookmark, Heart } from "lucide-react";
import { formatRelativeDate } from "@/lib/relativeDate";
import { cn } from "@/lib/utils";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w300";

type DateCardProps = {
  href: string;
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  date?: Date | string | null;
  className?: string;
  /** Bouton de suppression (croix) superposé en haut à droite — ex. retirer
   * un visionnage de l'historique. Rendu en sibling du `Link`, pas en enfant
   * (un `<button>` imbriqué dans un `<a>` casse silencieusement le clic). */
  onRemove?: () => void;
  removeLabel?: string;
  /** Icones d'état (favori/watchlist/vu), même convention que `TitlePoster`
   * (empilées en haut à gauche). Absentes par défaut — n'affecte pas les
   * usages existants (calendrier, sliders accueil) qui ne les passent pas. */
  watched?: boolean;
  inWatchlist?: boolean;
  inFavorites?: boolean;
  /** Menu actions rapides ("⋮", ex. `TitleQuickActionsMenu`) — rendu en
   * sibling du `Link`, à côté du bouton de suppression s'il est présent. */
  quickActions?: ReactNode;
  /** Ajoute l'heure (HH:mm) après la date relative dans le badge — utilisé
   * pour une date de VISIONNAGE (Historique), où l'heure est une info utile,
   * pas pour une date de diffusion (Calendrier). */
  showTime?: boolean;
};

export function DateCard({
  href,
  imageUrl,
  title,
  subtitle,
  date,
  className,
  onRemove,
  removeLabel = "Supprimer",
  watched = false,
  inWatchlist = false,
  inFavorites = false,
  quickActions,
  showTime = false,
}: DateCardProps) {
  const src = imageUrl
    ? imageUrl.startsWith("http")
      ? imageUrl
      : `${TMDB_POSTER_BASE_URL}${imageUrl}`
    : null;

  const dateLabel = (() => {
    if (!date) return null;
    const relative = formatRelativeDate(date);
    if (!showTime) return relative;
    const target = typeof date === "string" ? new Date(date) : date;
    const time = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;
    return `${relative} ${time}`;
  })();

  return (
    <div className={cn("group relative shrink-0 w-32 sm:w-36", className)}>
      <Link href={href}>
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted/20">
          {src ? (
            <img src={src} alt={title} className="w-full h-full object-cover" />
          ) : null}

          {(inFavorites || inWatchlist || watched) && (
            <div className="absolute top-1.5 left-1.5 z-10 flex flex-col items-center gap-1">
              {inFavorites && (
                <span
                  className="flex items-center justify-center rounded-full bg-black/70 p-1"
                  aria-label="Dans les favoris"
                  title="Dans les favoris"
                >
                  <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                </span>
              )}
              {inWatchlist && (
                <span
                  className="flex items-center justify-center rounded-full bg-black/70 p-1"
                  aria-label="Dans la watchlist"
                  title="Dans la watchlist"
                >
                  <Bookmark className="h-3 w-3 text-white fill-white" />
                </span>
              )}
              {watched && (
                <span
                  className="flex items-center justify-center rounded-full bg-black/70 p-1"
                  aria-label="Déjà vu"
                  title="Déjà vu"
                >
                  <Eye className="h-3 w-3 text-white fill-white" />
                </span>
              )}
            </div>
          )}

          {dateLabel && (
            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {dateLabel}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm font-medium line-clamp-1 group-hover:text-primary" title={title}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[11px] italic text-muted-foreground line-clamp-1" title={subtitle}>
            {subtitle}
          </p>
        )}
      </Link>
      {(onRemove || quickActions) && (
        <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
          {quickActions}
          {onRemove && (
            <button
              type="button"
              aria-label={removeLabel}
              title={removeLabel}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
