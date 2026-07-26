/**
 * Page détail d'un épisode.
 * Correspondance backend : GET /episodes/:id, GET /episodes/:id/credits
 */

"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TitleCredits } from "@/components/titles/TitleCredits";
import { useEpisode } from "@/hooks/api/useEpisode";
import { useEpisodeCredits } from "@/hooks/api/useEpisodeCredits";

export default function EpisodeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const { data: episode, isLoading, isError } = useEpisode(id);
  const {
    data: credits,
    isLoading: isCreditsLoading,
    isError: isCreditsError,
  } = useEpisodeCredits(id);

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
  const titleId = seasons?.title_id ?? "";

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
