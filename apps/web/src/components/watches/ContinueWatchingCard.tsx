/**
 * Carte du module accueil "Continuer à regarder" (modification U) — une
 * carte représente le PROCHAIN épisode non vu d'une série suivie (pas la
 * série en tant que telle) : titre de la série, "S01E01", barre de
 * progression (épisodes vus/total de la série) et mini bouton "marquer
 * comme vu" ciblant précisément cet épisode. Le menu actions rapides ("⋮")
 * reste au niveau série (watchlist/favoris/historique).
 *
 * Largeur fixe (contrairement à `DateCard`, en `w-32 sm:w-36` responsive) :
 * nécessaire pour positionner le mini bouton en pixels exacts sous le coin
 * bas droit de l'affiche, même calcul que `TitleCard`.
 */

import Link from "next/link";
import { TitleQuickActionsMenu } from "@/components/titles/TitleQuickActionsMenu";
import { TitleWatchedButton } from "@/components/titles/TitleWatchedButton";
import { ContinueWatchingEntry } from "@/lib/types/api";
import { cn } from "@/lib/utils";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w300";
const POSTER_WIDTH = 144;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

type ContinueWatchingCardProps = {
  entry: ContinueWatchingEntry;
  inWatchlist?: boolean;
  inFavorites?: boolean;
  /** Statut de progression dans la watchlist ("en_cours" / "a_jour" / "abandonnee"). */
  watchlistStatus?: "en_cours" | "a_jour" | "abandonnee";
  className?: string;
};

export function ContinueWatchingCard({
  entry,
  inWatchlist = false,
  inFavorites = false,
  watchlistStatus,
  className,
}: ContinueWatchingCardProps) {
  const title = entry.titre_vf || entry.titre_vo;
  const episodeCode = `S${String(entry.saison).padStart(2, "0")}E${String(entry.episode_numero).padStart(2, "0")}`;
  const src = entry.affiche_url
    ? entry.affiche_url.startsWith("http")
      ? entry.affiche_url
      : `${TMDB_POSTER_BASE_URL}${entry.affiche_url}`
    : null;
  const percent =
    entry.total_episodes > 0
      ? Math.round((entry.episodes_vus / entry.total_episodes) * 100)
      : 0;

  return (
    <div
      className={cn("group relative shrink-0", className)}
      style={{ width: `${POSTER_WIDTH}px` }}
    >
      <Link href={`/episodes/${entry.episode_id}`}>
        <div
          className="relative overflow-hidden rounded-lg bg-muted/20"
          style={{ width: `${POSTER_WIDTH}px`, height: `${POSTER_HEIGHT}px` }}
        >
          {src ? (
            <img src={src} alt={title} className="w-full h-full object-cover" />
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 pt-1 pb-1.5">
            <p className="mb-1 text-[10px] font-medium text-white">
              {entry.episodes_restants} épisode{entry.episodes_restants > 1 ? "s" : ""} restant
              {entry.episodes_restants > 1 ? "s" : ""}
            </p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-sm font-medium line-clamp-1 group-hover:text-primary">
          {title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {episodeCode}
          {entry.episode_titre ? ` — ${entry.episode_titre}` : ""}
        </p>
      </Link>

      <TitleQuickActionsMenu
        titleId={entry.title_id}
        type="serie"
        local
        inWatchlist={inWatchlist}
        inFavorites={inFavorites}
        watched={false}
        watchlistStatus={watchlistStatus}
        className="absolute top-1.5 right-1.5 z-30"
      />

      <TitleWatchedButton
        episodeId={entry.episode_id}
        className="absolute z-20"
        style={{ top: `${POSTER_HEIGHT}px`, right: "8px", transform: "translateY(-50%)" }}
      />
    </div>
  );
}
