/**
 * Page détail d'une personne.
 * Correspondance backend : GET /people/:id, /people/:id/filmography,
 * /people/:id/recommendations
 */

"use client";

import { useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PersonHero } from "@/components/people/PersonHero";
import { Filmography } from "@/components/people/Filmography";
import { usePerson } from "@/hooks/api/usePeople";
import { usePersonFilmography } from "@/hooks/api/usePeople";
import { usePersonRecommendations } from "@/hooks/api/usePersonRecommendations";
import { useRefreshFilmography } from "@/hooks/api/useRefreshFilmography";
import { useFollowedPeople } from "@/hooks/api/useFollowedPeople";
import { useAuthStore } from "@/store/authStore";
import { RefreshDataButton } from "@/components/common/RefreshDataButton";
import {
  FilmographyGrouped,
  PersonRecommendation,
} from "@/lib/types/api";
import { PersonCard } from "@/components/people/PersonCard";
import { CardSlider } from "@/components/common/CardSlider";
import { FollowPersonButton } from "@/components/people/FollowPersonButton";
import { dedupeGroupedByEntity } from "@/lib/creditGrouping";
import { extractIdFromRouteParam } from "@/lib/utils";

export default function PersonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = extractIdFromRouteParam(params.id);
  const { isAuthenticated } = useAuthStore();

  const { data: person, isLoading, isError } = usePerson(id);
  const {
    data: filmography,
    isLoading: isFilmographyLoading,
    isError: isFilmographyError,
  } = usePersonFilmography(id);
  const {
    data: recommendations,
    isLoading: isRecsLoading,
    isError: isRecsError,
  } = usePersonRecommendations(id);
  const { data: followedPeople } = useFollowedPeople(isAuthenticated);
  const isFollowed = followedPeople?.some((p) => p.id === id) ?? false;

  const filmographyCount = filmography
    ? dedupeGroupedByEntity(
        filmography as unknown as FilmographyGrouped,
        (item) => item.titre.id,
      ).length
    : 0;

  // Bug 27 — déclenche le refresh TMDB de la filmographie au chargement de la
  // page (fire-and-forget) : la liste affichée se met à jour automatiquement
  // via l'invalidation React Query une fois l'import terminé.
  const refreshFilmography = useRefreshFilmography(id);
  const hasTriggeredRefresh = useRef(false);
  useEffect(() => {
    if (hasTriggeredRefresh.current || !id) return;
    hasTriggeredRefresh.current = true;
    refreshFilmography.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (isError || !person) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-10">
        {/* Hero */}
        <PersonHero person={person} />

        {/* Actions utilisateur */}
        <FollowPersonButton personId={id} initialFollowed={isFollowed} />

        {/* Filmographie */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold">
              Filmographie {!isFilmographyLoading && `(${filmographyCount})`}
            </h2>
            <RefreshDataButton
              onRefresh={() => refreshFilmography.mutate()}
              isPending={refreshFilmography.isPending}
              isError={refreshFilmography.isError}
            />
          </div>
          {isFilmographyLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isFilmographyError || !filmography ? (
            <p className="text-sm text-muted-foreground">
              Aucune filmographie disponible pour cette personne.
            </p>
          ) : (
            <Filmography
              filmography={filmography as unknown as FilmographyGrouped}
            />
          )}
        </section>

        {/* Recommendations */}
        <section>
          <h2 className="text-2xl font-bold mb-4">
            Personnes connexes {!isRecsLoading && `(${recommendations?.length ?? 0})`}
          </h2>
          {isRecsLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isRecsError ||
            !recommendations ||
            recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune recommandation disponible pour cette personne.
            </p>
          ) : (
            <CardSlider>
              {recommendations.map((rec: PersonRecommendation) => (
                <PersonCard
                  key={rec.id}
                  person={{
                    id: rec.id,
                    tmdbId: rec.tmdb_id ?? undefined,
                    nom: rec.nom,
                    photoUrl: rec.photo_url ?? undefined,
                    local: true,
                  }}
                  className="shrink-0 w-32 sm:w-36"
                />
              ))}
            </CardSlider>
          )}
        </section>
      </div>
    </div>
  );
}
