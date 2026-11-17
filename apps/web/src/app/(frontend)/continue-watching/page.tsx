/**
 * Page "Continuer à regarder" : toutes les séries suivies ayant au moins
 * un épisode restant à voir (modification U, page dédiée).
 * Route : /continue-watching
 * Backend : GET /continue-watching — renvoie déjà l'intégralité des
 * entrées (naturellement bornée par le nombre de séries suivies, pas
 * besoin de pagination ici, contrairement à l'historique).
 *
 * Applique les filtres du header type/listes/statut vu — les entrées ne
 * portent ni genre/pays/note/année de sortie du titre (donnée non
 * disponible sans changement backend, même limitation que Calendrier).
 */

"use client";

import { TitlesTable } from "@/components/titles/TitlesTable";
import { ViewModeToggle } from "@/components/titles/ViewModeToggle";
import { useViewMode } from "@/hooks/useViewMode";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useContinueWatching } from "@/hooks/api/useContinueWatching";
import { useListMembership, useLists, useWatchedTitles } from "@/hooks/api";
import { useSelectionMode } from "@/hooks/useSelectionMode";
import { ContinueWatchingCard } from "@/components/watches/ContinueWatchingCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { BulkActionsBar } from "@/components/common/BulkActionsBar";
import { AlertCircle, ListChecks } from "lucide-react";
import { parseTitleFilters, titleMatchesFilters, buildListIdsByTitle } from "@/lib/titleFilters";

function ContinueWatchingPageContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const filters = parseTitleFilters(useSearchParams());
  const { data: entries, isLoading, error } = useContinueWatching(isAuthenticated);
  const { watchlistIds, favoriteIds, watchlistStatuses, watchlistId, favorisId } =
    useListMembership();
  const { data: userLists } = useLists(isAuthenticated);
  const { data: watchedTitles } = useWatchedTitles();
  const [viewMode, setViewMode] = useViewMode("continue-watching");
  const listIdsByTitle = buildListIdsByTitle(userLists);
  const { selectionMode, selectedIds, toggleSelectionMode, toggleSelected, clearSelection } =
    useSelectionMode();

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
  const filteredItems = items.filter((entry) =>
    titleMatchesFilters(
      {
        id: entry.title_id,
        type: "serie",
        year: undefined,
        note: undefined,
        genreIds: undefined,
        countryIds: undefined,
        listIds: listIdsByTitle.get(entry.title_id) ?? [],
        watched: watchedTitles?.has(entry.title_id) ?? false,
      },
      filters,
    ),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Continuer à regarder ({items.length})</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vos séries suivies avec des épisodes restants
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!selectionMode && <ViewModeToggle mode={viewMode} onChange={setViewMode} />}
            <Button type="button" variant="outline" size="sm" onClick={toggleSelectionMode}>
              <ListChecks className="mr-2 h-4 w-4" />
              {selectionMode ? "Terminer" : "Modifier le contenu"}
            </Button>
          </div>
        </div>

        {selectionMode && selectedIds.size > 0 && (
          <BulkActionsBar
            items={filteredItems
              .filter((entry) => selectedIds.has(entry.title_id))
              .map((entry) => ({ id: entry.title_id, titleId: entry.title_id, type: "serie" as const }))}
            watchlistId={watchlistId}
            favorisId={favorisId}
            onDone={clearSelection}
          />
        )}

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
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune série en cours ne correspond aux filtres actifs.
          </p>
        ) : viewMode === "tableau" && !selectionMode ? (
          <TitlesTable
            titles={filteredItems.map((entry) => ({
              id: entry.title_id,
              titre: entry.titre_vf || entry.titre_vo,
              type: "serie" as const,
              afficheUrl: entry.affiche_url ?? undefined,
              nombreEpisodes: entry.total_episodes,
              local: true,
            }))}
            hideColumns={["type", "annee", "note"]}
            flagsOf={(t) => ({
              watched: watchedTitles?.has(t.id),
              inWatchlist: watchlistIds.has(t.id),
              inFavorites: favoriteIds.has(t.id),
            })}
            extraColumns={[
              {
                id: "prochain",
                label: "Prochain épisode",
                render: (t) => {
                  const e = filteredItems.find((x) => x.title_id === t.id);
                  if (!e) return null;
                  const code = `S${String(e.saison).padStart(2, "0")}E${String(e.episode_numero).padStart(2, "0")}`;
                  return (
                    <span className="text-xs">
                      <span className="font-medium">{code}</span>
                      {e.episode_titre && <span className="text-muted-foreground"> · {e.episode_titre}</span>}
                    </span>
                  );
                },
                sortValue: (t) => {
                  const e = filteredItems.find((x) => x.title_id === t.id);
                  return e ? e.saison * 10000 + e.episode_numero : null;
                },
              },
              {
                id: "progression",
                label: "Vus",
                render: (t) => {
                  const e = filteredItems.find((x) => x.title_id === t.id);
                  return e ? (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {e.episodes_vus}/{e.total_episodes}
                    </span>
                  ) : null;
                },
                sortValue: (t) => {
                  const e = filteredItems.find((x) => x.title_id === t.id);
                  return e && e.total_episodes ? e.episodes_vus / e.total_episodes : null;
                },
              },
              {
                id: "restants",
                label: "Restants",
                render: (t) => (
                  <span className="text-xs text-muted-foreground">
                    {filteredItems.find((x) => x.title_id === t.id)?.episodes_restants ?? "—"}
                  </span>
                ),
                sortValue: (t) => filteredItems.find((x) => x.title_id === t.id)?.episodes_restants ?? null,
              },
            ]}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredItems.map((entry) => (
              <div key={entry.title_id} className="relative">
                {selectionMode && (
                  <SelectionCheckbox
                    selected={selectedIds.has(entry.title_id)}
                    onToggle={() => toggleSelected(entry.title_id)}
                  />
                )}
                <ContinueWatchingCard
                  entry={entry}
                  inWatchlist={watchlistIds.has(entry.title_id)}
                  inFavorites={favoriteIds.has(entry.title_id)}
                  watchlistStatus={watchlistStatuses.get(entry.title_id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContinueWatchingPage() {
  return (
    <Suspense fallback={null}>
      <ContinueWatchingPageContent />
    </Suspense>
  );
}
