/**
 * Page détail d'une liste : titres qu'elle contient.
 * Route : /lists/:id
 * Backend : GET /lists/:id
 *
 * Applique les filtres du header (type/genre/pays/année/note, bug filtres
 * header sur accueil/watchlist/listes/historique) aux titres affichés.
 */

"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useList } from "@/hooks/api/useList";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { TitleCard } from "@/components/titles/TitleCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  parseTitleFilters,
  titleMatchesFilters,
  toFilterableTitle,
} from "@/lib/titleFilters";
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

const typeLabels: Record<string, string> = {
  watchlist: "Watchlist",
  favoris: "Favoris",
  custom: "Personnalisée",
};

export default function ListDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: list, isLoading, error } = useList(params.id);
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  const filters = parseTitleFilters(searchParams);

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
        <h1 className="text-2xl font-bold">Liste</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir cette liste.
        </p>
      </div>
    );
  }

  const items = list?.items ?? [];
  const filteredItems = items.filter((item) =>
    titleMatchesFilters(toFilterableTitle(item), filters),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <Link
            href="/lists"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Mes listes
          </Link>

          {isLoading ? (
            <Skeleton className="h-8 w-64" />
          ) : list ? (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{list.nom}</h1>
                <span className="text-xs rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                  {typeLabels[list.type] ?? list.type}
                </span>
              </div>
              {list.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {list.description}
                </p>
              )}
            </>
          ) : null}
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
              Erreur lors du chargement de la liste.
            </AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cette liste est vide. Ajoutez des titres depuis leur fiche.
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun titre de cette liste ne correspond aux filtres actifs.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredItems.map((title) => (
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
        )}
      </div>
    </div>
  );
}
