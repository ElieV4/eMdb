/**
 * Page "Recommandés" — modification N : extraction dédiée du module
 * recommandations de l'accueil (qui n'affiche plus qu'une ligne + "Voir
 * davantage" pointant ici), cible où le résultat peut s'étaler sur
 * plusieurs lignes.
 * Correspondance backend : GET /recommendations/user — agrège les
 * recommandations par-titre (title_recommendations) des titres bien notés
 * ou vus par l'utilisateur. Supporte le filtre "Apprécié en France" du
 * header (paramètre `fr`, cf. lib/titleFilters.ts).
 *
 * Pagination par blocs (au moins 20 titres au chargement, +10 à chaque
 * "Charger plus") : l'algo n'expose pas de curseur, il recalcule un
 * classement complet pour un `limit` donné (cf. recommender.service.ts) —
 * "charger plus" redemande donc au backend un `limit` plus grand plutôt
 * que de paginer un jeu de résultats figé. Les filtres du header
 * (genre/pays/année/note/vu/listes, non supportés par le backend qui ne
 * connaît que `appreciesFr`) sont appliqués côté client via
 * `titleMatchesFilters` ; un changement de filtre réinitialise le bloc à
 * la taille de départ pour recalculer sur un jeu propre.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TitleCard } from "@/components/titles/TitleCard";
import { Button } from "@/components/ui/button";
import { useRecommendations } from "@/hooks/api/useDashboard";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { useLists } from "@/hooks/api/useLists";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  parseTitleFilters,
  titleMatchesFilters,
  toFilterableTitle,
  buildListIdsByTitle,
} from "@/lib/titleFilters";
import { Title, TitleSearchResult } from "@/lib/types/api";

const INITIAL_LIMIT = 20;
const LOAD_MORE_STEP = 10;
const MAX_LIMIT = 100;

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
    nombreEpisodes: title.nombreEpisodes,
  };
}

function RecommendationsPageContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const filters = parseTitleFilters(useSearchParams());
  const filtersKey = JSON.stringify(filters);

  const [limit, setLimit] = useState(INITIAL_LIMIT);
  // Un changement de filtre invalide le bloc chargé jusqu'ici : on
  // redémarre à la taille de départ pour que le recalcul reste cohérent.
  useEffect(() => {
    setLimit(INITIAL_LIMIT);
  }, [filtersKey]);

  const { data: recommendations, isLoading, isFetching } = useRecommendations(
    limit,
    filters.appreciesFr,
  );
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();
  const { data: userLists } = useLists(isAuthenticated);
  const listIdsByTitle = buildListIdsByTitle(userLists);

  const filteredRecommendations = (recommendations ?? []).filter((title) =>
    titleMatchesFilters(
      toFilterableTitle(title, { watchedTitleIds: watchedTitles, listIdsByTitle }),
      filters,
    ),
  );

  // Le backend recalcule un classement complet pour `limit` — s'il a
  // renvoyé exactement ce qui a été demandé, d'autres titres sont
  // potentiellement disponibles au-delà (sinon le pool de candidats est
  // épuisé, inutile de proposer "charger plus").
  const canLoadMore =
    (recommendations?.length ?? 0) >= limit && limit < MAX_LIMIT;

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
      ) : filteredRecommendations.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredRecommendations.map((title) => (
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

          {canLoadMore && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLimit((l) => Math.min(l + LOAD_MORE_STEP, MAX_LIMIT))}
                disabled={isFetching}
              >
                {isFetching ? "Chargement..." : "Charger plus"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          {recommendations && recommendations.length > 0
            ? "Aucune recommandation ne correspond aux filtres actifs."
            : "Commencez à noter des titres pour recevoir des recommandations."}
        </p>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={null}>
      <RecommendationsPageContent />
    </Suspense>
  );
}
