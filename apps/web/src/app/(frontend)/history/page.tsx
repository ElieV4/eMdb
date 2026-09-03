/**
 * Page historique : visionnages de l'utilisateur.
 * Route : /history
 * Backend : GET /watches
 *
 * Format inspiré du widget Outlook Android (modification J) : filtre de
 * période en haut de page, titres groupés par période choisie.
 */

"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useInfiniteWatches } from "@/hooks/api/useInfiniteWatches";
import { useLists } from "@/hooks/api/useLists";
import { useWatchedTitles } from "@/hooks/api/useWatchedTitles";
import { useListMembership } from "@/hooks/api/useListMembership";
import { useSelectionMode } from "@/hooks/useSelectionMode";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import { DateCard } from "@/components/common/DateCard";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { BulkActionsBar } from "@/components/common/BulkActionsBar";
import { TitleQuickActionsMenu } from "@/components/titles/TitleQuickActionsMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ListChecks } from "lucide-react";
import { parseTitleFilters, buildListIdsByTitle } from "@/lib/titleFilters";
import { groupByPeriod, Period } from "@/lib/periodGrouping";
import { UserWatch } from "@/lib/types/api";
import { buildEntityUrl } from "@/lib/utils";
import { buildCardText, formatRatingStars } from "@/lib/cardFormatting";

function HistoryPageContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Le filtre type (film/série) est appliqué côté serveur (useWatches). Les
  // filtres genre/pays/note ne s'appliquent pas : les visionnages ne portent
  // pas ces données du titre. Listes et statut "vu" s'appliquent côté client.
  const filters = parseTitleFilters(searchParams);
  const period = (searchParams.get("period") as Period | null) || "semaine";
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteWatches(
    { type: filters.type !== "tout" ? filters.type : undefined },
    { enabled: isAuthenticated },
  );
  const { data: lists } = useLists(isAuthenticated);
  const listIdsByTitle = buildListIdsByTitle(lists);
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds, watchlistId, favorisId } = useListMembership();
  const { selectionMode, selectedIds, toggleSelectionMode, toggleSelected, clearSelection } =
    useSelectionMode();

  // Charge la page suivante dès que la sentinelle en bas de liste entre
  // dans le viewport — l'historique complet se charge ainsi au fur et à
  // mesure du scroll plutôt qu'un unique appel plafonné à 100 éléments.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const setPeriod = (next: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", next);
    router.replace(`/history?${params.toString()}`);
  };

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
        <h1 className="text-2xl font-bold">Historique</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir votre historique de visionnage.
        </p>
      </div>
    );
  }

  const allWatches = data?.pages.flatMap((page) => page.items) ?? [];
  // Total réel côté backend (respecte le filtre type, appliqué serveur) —
  // pas seulement ce qui a déjà été chargé par le scroll infini. Les
  // filtres listes/statut/année étant appliqués côté client, ce total peut
  // différer du compte affiché une fois ces filtres actifs.
  const totalWatches = data?.pages[0]?.total ?? 0;

  // Filtre "Listes", "vu / tout / non vu" et "Date de visionnage" (menu
  // filtres, modification O) : appliqués côté client, les visionnages
  // n'étant filtrables côté serveur que par type.
  const filteredWatches = allWatches.filter((watch) => {
    if (filters.watchedStatus === "non_vu") return false; // tout l'historique est déjà "vu"

    if (filters.listIds.length > 0) {
      const watchLists = listIdsByTitle.get(watch.title_id) ?? [];
      if (!filters.listIds.some((id) => watchLists.includes(id))) return false;
    }

    if (filters.watchedYearMin !== null || filters.watchedYearMax !== null) {
      const year = new Date(watch.date_vue).getFullYear();
      if (filters.watchedYearMin !== null && year < filters.watchedYearMin) return false;
      if (filters.watchedYearMax !== null && year > filters.watchedYearMax) return false;
    }

    return true;
  });

  const groups = groupByPeriod<UserWatch>(
    filteredWatches,
    period,
    (watch) => new Date(watch.date_vue),
    true, // plus récent en premier
  );

  const hasActiveFilter =
    filters.type !== "tout" ||
    filters.listIds.length > 0 ||
    filters.watchedStatus !== "tout" ||
    filters.watchedYearMin !== null ||
    filters.watchedYearMax !== null;

  // Le titre résolu (série via l'épisode ou film direct) — nécessaire pour
  // les actions groupées, qui portent sur le titre, pas sur le visionnage.
  const resolveWatchTitle = (watch: UserWatch) => watch.titles ?? watch.episodes?.seasons.titles;

  const selectedBulkItems = filteredWatches
    .filter((watch) => selectedIds.has(watch.id))
    .map((watch) => {
      const resolvedTitle = resolveWatchTitle(watch);
      if (!resolvedTitle) return null;
      return {
        id: watch.id,
        titleId: resolvedTitle.id,
        type: resolvedTitle.type as "film" | "serie",
        watchId: watch.id,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Historique ({totalWatches})</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vos derniers visionnages
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={toggleSelectionMode}>
            <ListChecks className="mr-2 h-4 w-4" />
            {selectionMode ? "Terminer" : "Modifier le contenu"}
          </Button>
        </div>

        {selectionMode && selectedBulkItems.length > 0 && (
          <BulkActionsBar
            items={selectedBulkItems}
            watchlistId={watchlistId}
            favorisId={favorisId}
            allowDeleteHistory
            onDone={clearSelection}
          />
        )}

        <PeriodFilter value={period} onChange={setPeriod} />

        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement de l&apos;historique.
            </AlertDescription>
          </Alert>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasActiveFilter
              ? "Aucun visionnage ne correspond au filtre actif."
              : "Vous n'avez encore rien marqué comme vu."}
          </p>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.key} className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label} ({group.items.length})
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {group.items.map((watch) => {
                    // Un visionnage d'épisode n'a pas de `titles` direct
                    // (title_id reste null, cf. createWatch) — l'affiche/nom
                    // de la série se lit via episodes.seasons.titles.
                    const serie = watch.episodes?.seasons.titles;
                    const resolvedTitle = watch.titles ?? serie;
                    const dateSortie = resolvedTitle?.date_sortie
                      ? new Date(resolvedTitle.date_sortie).getFullYear()
                      : null;
                    const { title: label, subtitle } = buildCardText({
                      type: watch.episodes ? "serie" : ((resolvedTitle?.type as "film" | "serie") ?? "film"),
                      titre: resolvedTitle?.titre_vf || resolvedTitle?.titre_vo || "Titre inconnu",
                      annee: dateSortie,
                      episodeTitre: watch.episodes?.titre,
                      saison: watch.episodes?.seasons.numero,
                      episodeNumero: watch.episodes?.numero,
                      metricLabel: formatRatingStars(watch.note_perso),
                    });
                    const href = watch.episodes
                      ? `/episodes/${watch.episodes.id}`
                      : buildEntityUrl(
                          "/titles",
                          watch.title_id ?? "",
                          resolvedTitle?.titre_vf || resolvedTitle?.titre_vo,
                        );

                    return (
                      <div key={watch.id} className="relative">
                        {selectionMode && resolvedTitle && (
                          <SelectionCheckbox
                            selected={selectedIds.has(watch.id)}
                            onToggle={() => toggleSelected(watch.id)}
                          />
                        )}
                        <DateCard
                          href={href}
                          imageUrl={resolvedTitle?.affiche_url}
                          title={label}
                          subtitle={subtitle ?? undefined}
                          date={watch.date_vue}
                          showTime
                          watched={resolvedTitle ? watchedTitles?.has(resolvedTitle.id) : false}
                          inWatchlist={resolvedTitle ? watchlistIds.has(resolvedTitle.id) : false}
                          inFavorites={resolvedTitle ? favoriteIds.has(resolvedTitle.id) : false}
                          quickActions={
                            resolvedTitle && (
                              <TitleQuickActionsMenu
                                titleId={resolvedTitle.id}
                                episodeId={watch.episode_id ?? undefined}
                                tmdbId={resolvedTitle.tmdb_id ?? undefined}
                                type={resolvedTitle.type as "film" | "serie"}
                                inWatchlist={watchlistIds.has(resolvedTitle.id)}
                                inFavorites={favoriteIds.has(resolvedTitle.id)}
                                watched={watchedTitles?.has(resolvedTitle.id)}
                              />
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Sentinelle invisible : déclenche le chargement de la page
                suivante dès qu'elle entre dans le viewport. */}
            <div ref={sentinelRef} />

            {isFetchingNextPage && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3] w-full" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryPageContent />
    </Suspense>
  );
}
