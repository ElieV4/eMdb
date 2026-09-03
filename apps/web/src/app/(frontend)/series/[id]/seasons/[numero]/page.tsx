/**
 * Page détail d'une saison avec la liste de ses épisodes.
 * Correspondance backend : GET /titles/:titleId/seasons/:numero
 */

"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EpisodeRow, EpisodeCard } from "@/components/seasons";
import { useSeason } from "@/hooks/api/useSeason";
import { useTitle } from "@/hooks/api/useTitles";
import { useWatches } from "@/hooks/api/useWatches";
import { useAuthStore } from "@/store/authStore";
import { buildEntityUrl, extractIdFromRouteParam } from "@/lib/utils";

export default function SeasonDetailPage({
  params,
}: {
  params: { id: string; numero: string };
}) {
  const id = extractIdFromRouteParam(params.id);
  const { numero } = params;
  const seasonNumero = parseInt(numero, 10);
  const { isAuthenticated } = useAuthStore();

  const { data: season, isLoading, isError } = useSeason(id, seasonNumero);
  const { data: title } = useTitle(id);
  // Filtrer par title_id inclut aussi les visionnages par épisode de cette
  // série (bug #44) — un seul fetch pour toute la saison plutôt qu'un par
  // épisode, même logique que EpisodeSnapshot.
  const { data: watchesData } = useWatches(
    { title_id: id, limit: 100 },
    { enabled: isAuthenticated && !!id },
  );
  const watchedEpisodeIds = new Set(
    (watchesData?.items ?? [])
      .filter((watch) => watch.episode_id)
      .map((watch) => watch.episode_id as string),
  );

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (isError || !season) {
    return notFound();
  }

  const { titre, date_sortie, synopsis, episodes } = season;
  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;
  const titleHref = buildEntityUrl("/titles", id, title?.titre_vf || title?.titre_vo);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Navigation vers la série */}
        <Link
          href={titleHref}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la série
        </Link>

        {/* Header saison */}
        <div>
          {title && (
            <Link
              href={titleHref}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {title.titre_vf || title.titre_vo}
            </Link>
          )}
          <h1 className="text-3xl font-bold">
            {titre || `Saison ${seasonNumero}`}
          </h1>
          {year && (
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(date_sortie!).toLocaleDateString("fr-FR")}
            </p>
          )}
          {synopsis && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {synopsis}
            </p>
          )}
        </div>

        {/* Liste des épisodes */}
        <section>
          <h2 className="text-2xl font-bold mb-4">
            Épisodes ({episodes.length})
          </h2>

          {episodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun épisode disponible pour cette saison.
            </p>
          ) : (
            <>
              {/* Desktop : tableau de lignes */}
              <div className="hidden md:block space-y-2">
                {episodes.map((episode) => (
                  <EpisodeRow
                    key={episode.id}
                    episode={episode}
                    titleId={id}
                    seasonNumero={seasonNumero}
                    isWatched={watchedEpisodeIds.has(episode.id)}
                  />
                ))}
              </div>

              {/* Mobile : grille de cards */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {episodes.map((episode) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    titleId={id}
                    seasonNumero={seasonNumero}
                    isWatched={watchedEpisodeIds.has(episode.id)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
