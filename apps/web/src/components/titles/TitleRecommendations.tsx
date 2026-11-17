/**
 * Carrousel horizontal de titres recommandés.
 * Réutilise TitleCard avec le mapping titleRecommendationToSearchResult.
 *
 * Applique les filtres du header (modification O) : type, note IMDB,
 * statut vu, listes. L'année de sortie, le genre et le pays ne sont PAS
 * disponibles sur `TitleRecommendation` (endpoint recommandations TMDB,
 * qui ne renvoie ni date ni genre/pays) — ces trois filtres ne s'appliquent
 * donc pas ici.
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TitleRecommendation,
  titleRecommendationToSearchResult,
} from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { TitleCard } from "./TitleCard";
import { useWatchedTitles, useListMembership, useLists } from "@/hooks/api";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  parseTitleFilters,
  titleMatchesFilters,
  buildListIdsByTitle,
  FilterableTitle,
} from "@/lib/titleFilters";

interface TitleRecommendationsProps {
  recommendations: TitleRecommendation[];
  className?: string;
}

export function TitleRecommendations({
  recommendations,
  className,
}: TitleRecommendationsProps) {
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();
  const { isAuthenticated } = useAuth();
  const { data: userLists } = useLists(isAuthenticated);
  const listIdsByTitle = buildListIdsByTitle(userLists);
  const filters = parseTitleFilters(useSearchParams());

  const toFilterable = (rec: TitleRecommendation): FilterableTitle => ({
    id: rec.id || "",
    type: rec.type,
    year: undefined,
    note: rec.note_imdb ?? null,
    genreIds: undefined,
    countryIds: undefined,
    listIds: rec.id ? listIdsByTitle.get(rec.id) ?? [] : [],
    watched: rec.id ? watchedTitles?.has(rec.id) ?? false : false,
  });

  const filtered = (recommendations ?? []).filter((rec) =>
    titleMatchesFilters(toFilterable(rec), filters),
  );

  if (!recommendations || recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucune recommandation disponible pour ce titre.
      </p>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucune recommandation ne correspond aux filtres actifs.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold">Titres recommandés</h3>

      <div className="relative">
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
          {filtered.map((rec) => (
            <div key={rec.id} className="shrink-0 w-40">
              <TitleCard
                title={titleRecommendationToSearchResult(rec)}
                compact
                showType={false}
                watched={rec.id ? watchedTitles?.has(rec.id) : undefined}
                inWatchlist={rec.id ? watchlistIds.has(rec.id) : undefined}
                inFavorites={rec.id ? favoriteIds.has(rec.id) : undefined}
              />
            </div>
          ))}
        </div>

        {/* Navigation (indique la possibilité de scroll) */}
        <div className="flex justify-end gap-2 mt-2">
          <Link
            href={`/search?query=${encodeURIComponent(
              recommendations[0]?.titre_vo ?? "",
            )}`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Voir plus de recommandations
          </Link>
        </div>
      </div>
    </div>
  );
}
