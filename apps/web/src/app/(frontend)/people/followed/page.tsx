/**
 * Page des personnes suivies.
 * Route : /people/followed
 * Backend : GET /people/followed
 */

"use client";

import { useAuthStore } from "@/store/authStore";
import { useFollowedPeople } from "@/hooks/api/useFollowedPeople";
import { PersonCard } from "@/components/people/PersonCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";

export default function FollowedPeoplePage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: people, isLoading, isError } = useFollowedPeople(isAuthenticated);

  if (isAuthLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Personnes suivies</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir les personnes que vous suivez.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Personnes suivies {people ? `(${people.length})` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Leurs futurs films et séries sont ajoutés automatiquement à votre
            watchlist dès qu'ils sont annoncés.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Erreur lors du chargement des personnes suivies.
          </p>
        ) : !people || people.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Vous ne suivez aucune personne pour le moment. Suivez un acteur ou
            un réalisateur depuis sa fiche pour être averti de ses prochains
            films et séries.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {people.map((person) => (
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
      </div>
    </div>
  );
}
