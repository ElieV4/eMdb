/**
 * Page des notes de l'utilisateur.
 * Applique les filtres du header (type/genre/pays/note/année/listes/vu) —
 * jusqu'ici ignorés, alors que /ratings ne liste que des titres locaux qui
 * portent toutes ces données (contrairement à Découvrir/Recommandés).
 *
 * Phase 4.2 — Ratings
 */

"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUserRatings } from "@/hooks/api/useUserRatings";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { RatingBadge } from "@/components/ratings/RatingBadge";
import { useDeleteRating } from "@/hooks/api/useDeleteRating";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  parseTitleFilters,
  titleMatchesFilters,
  buildListIdsByTitle,
  FilterableTitle,
} from "@/lib/titleFilters";
import { RatingTitleSummary, UserRating } from "@/lib/types/api";

function toFilterable(
  title: RatingTitleSummary,
  context: { watchedTitleIds?: Set<string>; listIdsByTitle: Map<string, string[]> },
): FilterableTitle {
  return {
    id: title.id,
    type: title.type,
    year: title.date_sortie ? new Date(title.date_sortie).getFullYear() : null,
    note: title.note_imdb,
    genreIds: title.title_genres.map((g) => g.genre_id),
    countryIds: title.title_countries.map((c) => c.country_id),
    listIds: context.listIdsByTitle.get(title.id) ?? [],
    watched: context.watchedTitleIds?.has(title.id) ?? false,
  };
}

function RatingsPageContent() {
  const searchParams = useSearchParams();
  const filters = parseTitleFilters(searchParams);
  const { data, isLoading, error } = useUserRatings({
    type: filters.type !== "tout" ? filters.type : undefined,
    limit: 20,
  });
  const deleteRating = useDeleteRating();
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  const listIdsByTitle = buildListIdsByTitle(
    [
      { id: "watchlist", items: [...watchlistIds].map((titleId) => ({ titleId })) },
      { id: "favoris", items: [...favoriteIds].map((titleId) => ({ titleId })) },
    ].filter((l) => l.items.length > 0),
  );

  const items = data?.items ?? [];
  const filteredItems = items.filter((rating: UserRating) => {
    if (!rating.title) return true; // note sur un épisode : pas de titre à filtrer
    return titleMatchesFilters(
      toFilterable(rating.title, { watchedTitleIds: watchedTitles, listIdsByTitle }),
      filters,
    );
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <h1 className="text-3xl font-bold mb-6">Mes notes</h1>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Mes notes</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des notes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Mes notes</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          Vous n'avez pas encore de notes.
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="text-muted-foreground">
          Aucune note ne correspond aux filtres actifs.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((rating) => {
            const titleName = rating.title
              ? rating.title.titre_vf || rating.title.titre_vo
              : rating.episode
                ? `S${rating.episode.season?.numero ?? "?"}E${rating.episode.numero}`
                : "Titre inconnu";

            return (
              <div
                key={rating.id}
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div className="flex-1">
                  <p className="font-medium">{titleName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(rating.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  {rating.commentaire && (
                    <p className="text-sm mt-1 line-clamp-2">
                      {rating.commentaire}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <RatingBadge note={rating.note_perso} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRating.mutate(rating.id)}
                    disabled={deleteRating.isPending}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RatingsPage() {
  return (
    <Suspense fallback={null}>
      <RatingsPageContent />
    </Suspense>
  );
}
