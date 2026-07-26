/**
 * Page détail d'une personne.
 * Correspondance backend : GET /people/:id, /people/:id/filmography,
 * /people/:id/recommendations
 */

"use client";

import { notFound } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PersonHero } from "@/components/people/PersonHero";
import { Filmography } from "@/components/people/Filmography";
import { usePerson } from "@/hooks/api/usePeople";
import { usePersonFilmography } from "@/hooks/api/usePeople";
import { usePersonRecommendations } from "@/hooks/api/usePersonRecommendations";
import {
  FilmographyGrouped,
  PersonRecommendation,
  titleRecommendationToSearchResult,
} from "@/lib/types/api";
import { TitleCard } from "@/components/titles/TitleCard";

export default function PersonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

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

        {/* Filmographie */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Filmographie</h2>
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
          <h2 className="text-2xl font-bold mb-4">Personnes connexes</h2>
          {isRecsLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isRecsError ||
            !recommendations ||
            recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune recommandation disponible pour cette personne.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {recommendations.map((rec: PersonRecommendation) => (
                <div key={rec.id} className="shrink-0">
                  <TitleCard
                    title={{
                      id: rec.id,
                      tmdbId: rec.tmdb_id ?? undefined,
                      titre: rec.nom,
                      titreOriginal: undefined,
                      type: "film",
                      dateSortie: undefined,
                      note: undefined,
                      afficheUrl: rec.photo_url ?? undefined,
                      genres: undefined,
                      pays: undefined,
                    }}
                    compact
                    showType={false}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
