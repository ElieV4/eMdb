/**
 * Page détail d'un épisode.
 * Correspondance backend : GET /episodes/:id, GET /episodes/:id/credits
 */

"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft, ExternalLink } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TitleCredits } from "@/components/titles/TitleCredits";
import { WatchLinksSection } from "@/components/titles/WatchLinksSection";
import { WatchButton } from "@/components/watches/WatchButton";
import { RatingInput } from "@/components/ratings/RatingInput";
import { useEpisode } from "@/hooks/api/useEpisode";
import { useTitle } from "@/hooks/api/useTitles";
import { useWatchLinks } from "@/hooks/useWatchLinks";
import { useEpisodeCredits } from "@/hooks/api/useEpisodeCredits";
import { useWatches } from "@/hooks/api/useWatches";
import { useUpsertRating } from "@/hooks/api/useUpsertRating";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { buildEntityUrl } from "@/lib/utils";

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
  const episodeYear = episode?.date_sortie
    ? new Date(episode.date_sortie).getFullYear()
    : null;

  // Appelé avant tout retour anticipé (règle des hooks) — avec des valeurs
  // de repli tant que `title` n'est pas chargé, sans effet indésirable
  // (cf. useWatchLinks : pas d'appel réseau tant que tmdbId est absent).
  const { officialProviders, freeLinks, isFreeLinksLoading } = useWatchLinks({
    titreVo: title?.titre_vo ?? "",
    titreVf: title?.titre_vf,
    type: title?.type ?? "serie",
    tmdbId: title?.tmdb_id,
    anneeSortie: episodeYear,
    afficheUrl: title?.affiche_url,
  });

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
  const titleLabel = title?.titre_vf || title?.titre_vo;
  const titleHref = buildEntityUrl("/titles", titleId, titleLabel);
  const seasonHref = `${buildEntityUrl("/series", titleId, titleLabel)}/seasons/${seasonNumero}`;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Navigation vers la saison */}
        {titleId && (
          <Link
            href={seasonHref}
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
                {titleId && (
                  <>
                    <Link
                      href={titleHref}
                      className="hover:text-foreground hover:underline"
                    >
                      {title?.titre_vf || title?.titre_vo}
                    </Link>
                    {" • "}
                  </>
                )}
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

            {title?.tmdb_id && (
              <a
                href={`https://www.themoviedb.org/tv/${title.tmdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Voir sur TMDB
              </a>
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
          <WatchLinksSection
            officialProviders={officialProviders}
            freeLinks={freeLinks}
            isFreeLinksLoading={isFreeLinksLoading}
          />
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