/**
 * Page détail d'un studio — reprend la structure de la page people
 * (hero + filmographie + "personnes connexes").
 * Correspondance backend : GET /studios/:id, /studios/:id/filmography,
 * /studios/:id/people
 */

"use client";

import { notFound } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { RefreshDataButton } from "@/components/common/RefreshDataButton";
import { StudioHero } from "@/components/studios/StudioHero";
import { Filmography } from "@/components/people/Filmography";
import { PersonCard } from "@/components/people/PersonCard";
import {
  useStudio,
  useStudioFilmography,
  useStudioRelatedPeople,
  useRefreshStudioFilmography,
} from "@/hooks/api/useStudio";
import { FilmographyGrouped, PersonRecommendation } from "@/lib/types/api";

export default function StudioDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const { data: studio, isLoading, isError } = useStudio(id);
  const {
    data: filmography,
    isLoading: isFilmographyLoading,
    isError: isFilmographyError,
  } = useStudioFilmography(id);
  const {
    data: relatedPeople,
    isLoading: isPeopleLoading,
    isError: isPeopleError,
  } = useStudioRelatedPeople(id);
  const refreshFilmography = useRefreshStudioFilmography(id);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (isError || !studio) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-10">
        {/* Hero */}
        <StudioHero studio={studio} />

        {/* Filmographie */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold">Filmographie</h2>
            <RefreshDataButton
              onRefresh={() => refreshFilmography.mutate()}
              isPending={refreshFilmography.isPending}
              isError={refreshFilmography.isError}
              label="Actualiser"
              pendingLabel="Actualisation..."
            />
          </div>
          {isFilmographyLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isFilmographyError || !filmography ? (
            <p className="text-sm text-muted-foreground">
              Aucune filmographie disponible pour ce studio.
            </p>
          ) : (
            <Filmography
              filmography={filmography as unknown as FilmographyGrouped}
            />
          )}
        </section>

        {/* Personnes connexes */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Personnes connexes</h2>
          {isPeopleLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isPeopleError || !relatedPeople || relatedPeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune personne connexe disponible pour ce studio.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {relatedPeople.map((person: PersonRecommendation) => (
                <PersonCard
                  key={person.id}
                  person={{
                    id: person.id,
                    tmdbId: person.tmdb_id ?? undefined,
                    nom: person.nom,
                    photoUrl: person.photo_url ?? undefined,
                    local: true,
                  }}
                  compact
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
