/**
 * Page watchlist : films et séries à voir.
 * Route : /watchlist
 * Backend : GET /lists (repère la liste de type "watchlist", créée
 * automatiquement à l'inscription) puis GET /lists/:id pour ses titres —
 * GET /lists seul ne renvoie pas les titres au format affichable.
 *
 * Applique les filtres du header (type/genre/pays/année/note).
 */

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLists } from "@/hooks/api/useLists";
import { useList } from "@/hooks/api/useList";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { useProgressiveReveal } from "@/hooks/useProgressiveReveal";
import { useSelectionMode } from "@/hooks/useSelectionMode";
import { TitleCard } from "@/components/titles/TitleCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { BulkActionsBar } from "@/components/common/BulkActionsBar";
import { AlertCircle, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseTitleFilters,
  titleMatchesFilters,
  toFilterableTitle,
  buildListIdsByTitle,
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

function WatchlistPageContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: lists, isLoading: isListsLoading } = useLists(isAuthenticated);
  const watchlistId = lists?.find((list) => list.type === "watchlist")?.id;
  const {
    data: watchlist,
    isLoading: isDetailLoading,
    error,
  } = useList(watchlistId ?? "");
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds, favorisId } = useListMembership();
  const { selectionMode, selectedIds, toggleSelectionMode, toggleSelected, clearSelection } =
    useSelectionMode();

  const filters = parseTitleFilters(searchParams);
  const isLoading = isListsLoading || (!!watchlistId && isDetailLoading);

  // Filtre de progression de la watchlist : "tous" (défaut), "a_jour",
  // "en_cours", "abandonnee" — sélectionner une option retire les films
  // (le statut de progression ne s'applique qu'aux séries).
  const progressionFilter = searchParams.get("progression") ?? "tous";

  // Calculés avant tout retour anticipé : `useProgressiveReveal` contient
  // des hooks React, qui doivent être appelés inconditionnellement à
  // chaque rendu (règle des hooks) — impossible de le faire après les
  // `if (...) return` d'authentification ci-dessous.
  const listIdsByTitle = buildListIdsByTitle(lists);
  const items = watchlist?.items ?? [];
  const filteredItems = items.filter((item) => {
    if (!titleMatchesFilters(
      toFilterableTitle(item, { watchedTitleIds: watchedTitles, listIdsByTitle }),
      filters,
    )) return false;
    if (progressionFilter === "tous") return true;
    // Les films n'ont pas de statut de progression — retirés quand un
    // filtre de progression est actif.
    if (item.type === "film") return false;
    return (item.statut ?? "en_cours") === progressionFilter;
  });
  const { visibleItems, sentinelRef } = useProgressiveReveal(filteredItems, 24);

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
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir votre watchlist.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Watchlist ({items.length})</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Films et séries à voir
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={toggleSelectionMode}>
            <ListChecks className="mr-2 h-4 w-4" />
            {selectionMode ? "Terminer" : "Modifier le contenu"}
          </Button>
        </div>

        {selectionMode && selectedIds.size > 0 && (
          <BulkActionsBar
            items={filteredItems
              .filter((title) => selectedIds.has(title.id))
              .map((title) => ({ id: title.id, titleId: title.id, type: title.type }))}
            watchlistId={watchlistId}
            favorisId={favorisId}
            onDone={clearSelection}
          />
        )}

        {/* Filtres de progression — sélectionner une option retire les films */}
        <div className="flex flex-wrap gap-1 rounded-lg border p-1 w-fit">
          {[
            { value: "tous", label: "Tous" },
            { value: "a_jour", label: "À jour" },
            { value: "en_cours", label: "En cours" },
            { value: "abandonnee", label: "Abandonnée" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                if (option.value === "tous") {
                  params.delete("progression");
                } else {
                  params.set("progression", option.value);
                }
                const qs = params.toString();
                window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                progressionFilter === option.value
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          ))}
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
              Erreur lors du chargement de la watchlist.
            </AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Votre watchlist est vide. Ajoutez des titres à voir depuis leur
            fiche.
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun titre de votre watchlist ne correspond aux filtres actifs.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {visibleItems.map((title) => (
                <div key={title.id} className="relative">
                  {selectionMode && (
                    <SelectionCheckbox
                      selected={selectedIds.has(title.id)}
                      onToggle={() => toggleSelected(title.id)}
                    />
                  )}
                  <TitleCard
                    title={titleToSearchResult(title)}
                    compact
                    watched={watchedTitles?.has(title.id)}
                    inWatchlist={watchlistIds.has(title.id)}
                    inFavorites={favoriteIds.has(title.id)}
                    watchlistStatus={title.statut}
                  />
                </div>
              ))}
            </div>
            <div ref={sentinelRef} />
          </>
        )}
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  return (
    <Suspense fallback={null}>
      <WatchlistPageContent />
    </Suspense>
  );
}
