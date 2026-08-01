/**
 * Page "Recommandés" — modification N : extraction dédiée du module
 * recommandations de l'accueil (qui n'affiche plus qu'une ligne + "Voir
 * davantage" pointant ici), cible où le résultat peut s'étaler sur
 * plusieurs lignes.
 * Correspondance backend : `useRecommendations` (stub, cf.
 * `hooks/api/useDashboard.ts` — à implémenter côté backend avec un
 * endpoint dédié ; cette page reflète donc le même état vide que le module
 * de l'accueil tant que ce n'est pas branché).
 */

"use client";

import { TitleCard } from "@/components/titles/TitleCard";
import { useRecommendations } from "@/hooks/api/useDashboard";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Title, TitleSearchResult } from "@/lib/types/api";

function titleToSearchResult(title: Title): TitleSearchResult {
  return {
    id: title.id,
    tmdbId: title.tmdbId,
    titre: title.titre,
    titreOriginal: title.titreOriginal,
    type: title.type,
    dateSortie: title.dateSortie,
    duree: title.duree,
    note: title.note,
    afficheUrl: title.afficheUrl,
    genres: title.genres,
    pays: title.pays,
    local: true,
  };
}

export default function RecommendationsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: recommendations, isLoading } = useRecommendations(24);
  const { data: watchedTitles } = useWatchedTitles();
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
        <h1 className="text-2xl font-bold">Recommandés</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour recevoir des recommandations personnalisées.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Recommandés</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Suggestions basées sur vos goûts
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : recommendations && recommendations.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {recommendations.map((title) => (
            <TitleCard
              key={title.id}
              title={titleToSearchResult(title)}
              compact
              watched={watchedTitles?.has(title.id)}
              inWatchlist={watchlistIds.has(title.id)}
              inFavorites={favoriteIds.has(title.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          Commencez à noter des titres pour recevoir des recommandations.
        </p>
      )}
    </div>
  );
}
