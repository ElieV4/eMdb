/**
 * Page "Continuer à regarder" : toutes les séries suivies ayant au moins
 * un épisode restant à voir (modification U, page dédiée).
 * Route : /continue-watching
 * Backend : GET /continue-watching — renvoie déjà l'intégralité des
 * entrées (naturellement bornée par le nombre de séries suivies, pas
 * besoin de pagination ici, contrairement à l'historique).
 */

"use client";

import { useAuthStore } from "@/store/authStore";
import { useContinueWatching } from "@/hooks/api/useContinueWatching";
import { useListMembership } from "@/hooks/api";
import { ContinueWatchingCard } from "@/components/watches/ContinueWatchingCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function ContinueWatchingPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: entries, isLoading, error } = useContinueWatching(isAuthenticated);
  const { watchlistIds, favoriteIds } = useListMembership();

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
        <h1 className="text-2xl font-bold">Continuer à regarder</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir vos séries en cours.
        </p>
      </div>
    );
  }

  const items = entries ?? [];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Continuer à regarder ({items.length})</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vos séries suivies avec des épisodes restants
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement de vos séries en cours.
            </AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune série en cours pour le moment. Suivez des séries pour les
            retrouver ici.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((entry) => (
              <ContinueWatchingCard
                key={entry.title_id}
                entry={entry}
                inWatchlist={watchlistIds.has(entry.title_id)}
                inFavorites={favoriteIds.has(entry.title_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
