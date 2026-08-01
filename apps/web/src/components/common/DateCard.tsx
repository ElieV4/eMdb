/**
 * Carte compacte (vignette + titre) — badge de date relative superposé en
 * bas à droite. Utilisée par les sliders horizontaux Historique/Calendrier
 * de l'accueil et par les grilles des pages dédiées /history et /calendar
 * (modification J, puis retour "garde le format affiche").
 */

import Link from "next/link";
import { X } from "lucide-react";
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
}: DateCardProps) {
  const src = imageUrl
    ? imageUrl.startsWith("http")
      ? imageUrl
      : `${TMDB_POSTER_BASE_URL}${imageUrl}`
    : null;

  return (
    <div className={cn("group relative shrink-0 w-32 sm:w-36", className)}>
      <Link href={href}>
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted/20">
          {src ? (
            <img src={src} alt={title} className="w-full h-full object-cover" />
          ) : null}
          {date && (
            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {formatRelativeDate(date)}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm font-medium line-clamp-1 group-hover:text-primary">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {subtitle}
          </p>
        )}
      </Link>
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
          className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/90"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
