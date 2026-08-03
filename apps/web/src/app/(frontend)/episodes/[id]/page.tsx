/**
 * Page détail d'un épisode.
 * Correspondance backend : GET /episodes/:id, GET /episodes/:id/credits
 */

"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TitleCredits } from "@/components/titles/TitleCredits";
import { WatchButton } from "@/components/watches/WatchButton";
import { RatingInput } from "@/components/ratings/RatingInput";
import { useEpisode } from "@/hooks/api/useEpisode";
import { useTitle } from "@/hooks/api/useTitles";
import { buildWatchLinks } from "@/lib/watchLinks";
import { useEpisodeCredits } from "@/hooks/api/useEpisodeCredits";
import { useWatches } from "@/hooks/api/useWatches";
import { useUpsertRating } from "@/hooks/api/useUpsertRating";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";

export default function EpisodeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: episode, isLoading, isError } = useEpisode(id);
  const titleId = episode?.seasons?.title_id ?? "";
  const { data: title } = useTitle(titleId);
  const {
    data: credits,
    isLoading: isCreditsLoading,
    isError: isCreditsError,
  } = useEpisodeCredits(id);

  // Fetch watches to determine if this episode is watched
  const { data: watchesData } = useWatches({ episode_id: id, limit: 100 });
  const upsertRating = useUpsertRating();

  const episodeWatches = watchesData?.items ?? [];

  const handleWatchChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (isError || !episode) {
    return notFound();
  }

  const {
    numero,
    titre,
    synopsis,
    date_sortie,
    duree_minutes,
    image_url,
    seasons,
  } = episode;

  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;
  const dateStr = date_sortie
    ? new Date(date_sortie).toLocaleDateString("fr-FR")
    : null;

  const seasonNumero = seasons?.numero ?? 0;

  const watchLinks = title
    ? buildWatchLinks({
        title: title.titre_vo,
        type: title.type,
        tmdbId: title.tmdb_id,
      })
    : { officialLinks: [], freeLinks: [] };

  const renderLinkGroup = (groupTitle: string, links: Array<{ name: string; href: string }>) => {
    if (links.length === 0) return null;

    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {groupTitle}
        </h2>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-border bg-background/70 px-3 py-1.5 text-sm text-foreground hover:bg-muted/60"
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Navigation vers la saison */}
        {titleId && (
          <Link
            href={`/series/${titleId}/seasons/${seasonNumero}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la saison {seasonNumero}
          </Link>
        )}

        {/* Header épisode */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Still */}
          <div className="mx-auto md:mx-0 shrink-0">
            <div className="relative h-48 w-36 overflow-hidden rounded-lg bg-muted/20">
              {image_url ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${image_url}`}
                  alt={titre}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    Pas d'image
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Infos */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{titre}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Saison {seasonNumero} • Épisode {numero}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {year && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{dateStr}</span>
                </span>
              )}
              {duree_minutes && (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{duree_minutes} min</span>
                </span>
              )}
            </div>

            {synopsis && (
              <p className="text-sm text-muted-foreground">{synopsis}</p>
            )}
          </div>
        </div>

        {/* Actions utilisateur */}
        {isAuthenticated && (
          <div className="flex flex-wrap items-center gap-3 border-y py-4">
            <WatchButton
              episodeId={id}
              releaseDate={date_sortie}
              watches={episodeWatches}
              onChanged={handleWatchChanged}
            />
            <RatingInput
              value={null}
              onChange={(value) =>
                upsertRating.mutate({ episode_id: id, note_perso: value })
              }
            />
          </div>
        )}

        {title && (
          <div className="grid gap-4 pt-2 md:grid-cols-2">
            {renderLinkGroup("Liens officiels", watchLinks.officialLinks)}
            {renderLinkGroup("Liens libres", watchLinks.freeLinks)}
          </div>
        )}

        {/* Crédits de l'épisode */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Casting de l'épisode</h2>
          {isCreditsLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isCreditsError || !credits ? (
            <p className="text-sm text-muted-foreground">
              Aucun crédit disponible pour cet épisode.
            </p>
          ) : Object.keys(credits).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun crédit disponible pour cet épisode.
            </p>
          ) : (
            <TitleCredits credits={credits} />
          )}
        </section>
      </div>
    </div>
  );
}