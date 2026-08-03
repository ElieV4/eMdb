/**
 * Page historique : visionnages de l'utilisateur.
 * Route : /history
 * Backend : GET /watches
 *
 * Format inspiré du widget Outlook Android (modification J) : filtre de
 * période en haut de page, titres groupés par période choisie.
 */

"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useInfiniteWatches } from "@/hooks/api/useInfiniteWatches";
import { useLists } from "@/hooks/api/useLists";
import { useWatchedTitles } from "@/hooks/api/useWatchedTitles";
import { useListMembership } from "@/hooks/api/useListMembership";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import { DateCard } from "@/components/common/DateCard";
import { TitleQuickActionsMenu } from "@/components/titles/TitleQuickActionsMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { parseTitleFilters, buildListIdsByTitle } from "@/lib/titleFilters";
import { groupByPeriod, Period } from "@/lib/periodGrouping";
import { UserWatch } from "@/lib/types/api";

export default function HistoryPage() {
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
  const { watchlistIds, favoriteIds } = useListMembership();

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

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Historique</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vos derniers visionnages
          </p>
        </div>

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
                  {group.label}
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {group.items.map((watch) => {
                    // Un visionnage d'épisode n'a pas de `titles` direct
                    // (title_id reste null, cf. createWatch) — l'affiche/nom
                    // de la série se lit via episodes.seasons.titles.
                    const serie = watch.episodes?.seasons.titles;
                    const resolvedTitle = watch.titles ?? serie;
                    const label = watch.episodes
                      ? `${serie?.titre_vf || serie?.titre_vo || "Série"} — Épisode ${watch.episodes.numero}`
                      : watch.titles?.titre_vf || watch.titles?.titre_vo || "Titre inconnu";
                    const href = watch.episodes
                      ? `/episodes/${watch.episodes.id}`
                      : `/titles/${watch.title_id}`;

                    return (
                      <DateCard
                        key={watch.id}
                        href={href}
                        imageUrl={resolvedTitle?.affiche_url}
                        title={label}
                        date={watch.date_vue}
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
