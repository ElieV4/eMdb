/**
 * Page calendrier : épisodes non vus des séries suivies.
 * Route : /calendar
 * Backend : GET /calendar
 *
 * Format inspiré du widget Outlook Android (modification J) : filtre de
 * période en haut de page, épisodes groupés par période choisie — même
 * comportement que la page Historique.
 *
 * Applique les filtres du header type/listes/statut vu — les entrées ne
 * portent ni genre/pays/note/année de sortie du titre (donnée non
 * disponible sans changement backend, même limitation que "Continuer à
 * regarder"). Appliqués côté client, comme listes/statut/année sur
 * l'historique : le total du header reste le total backend brut.
 */

"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useInfiniteCalendar } from "@/hooks/api/useInfiniteCalendar";
import { useLists, useWatchedTitles } from "@/hooks/api";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import { DateCard } from "@/components/common/DateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Tv } from "lucide-react";
import { groupByPeriod, Period } from "@/lib/periodGrouping";
import { CalendarEntry } from "@/lib/types/api";
import { buildEntityUrl } from "@/lib/utils";
import { buildCardText, formatDuration } from "@/lib/cardFormatting";
import { parseTitleFilters, titleMatchesFilters, buildListIdsByTitle } from "@/lib/titleFilters";

function CalendarPageContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseTitleFilters(searchParams);
  const period = (searchParams.get("period") as Period | null) || "semaine";
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCalendar(isAuthenticated);
  const { data: userLists } = useLists(isAuthenticated);
  const { data: watchedTitles } = useWatchedTitles();
  const listIdsByTitle = buildListIdsByTitle(userLists);
  const rawEntries = data?.pages.flatMap((page) => page.items);
  const entries = rawEntries?.filter((entry) =>
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
  // Total réel côté backend — pas seulement ce qui a déjà été chargé par le
  // scroll infini (et pas affecté par les filtres client, cf. commentaire
  // d'en-tête).
  const totalEntries = data?.pages[0]?.total ?? 0;

  const setPeriod = (next: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", next);
    router.replace(`/calendar?${params.toString()}`);
  };

  // Charge la page suivante dès que la sentinelle en bas de liste entre
  // dans le viewport (même pattern que /history).
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
        <h1 className="text-2xl font-bold">Calendrier</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir vos épisodes à venir.
        </p>
      </div>
    );
  }

  // Les épisodes sans date de diffusion connue ne peuvent pas être groupés
  // par période — affichés à part, à la fin.
  const dated = (entries ?? []).filter((e) => e.date_diffusion);
  const undated = (entries ?? []).filter((e) => !e.date_diffusion);
  const groups = groupByPeriod<CalendarEntry>(
    dated,
    period,
    (entry) => new Date(entry.date_diffusion as Date),
    false, // plus proche en premier
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Calendrier ({totalEntries})</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Épisodes à venir de vos séries suivies
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
              Erreur lors du chargement du calendrier.
            </AlertDescription>
          </Alert>
        ) : !entries || entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Tv className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>
              {rawEntries && rawEntries.length > 0
                ? "Aucun épisode à venir ne correspond aux filtres actifs."
                : "Aucun épisode à venir pour le moment."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.key} className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label} ({group.items.length})
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {group.items.map((entry, idx) => {
                    const { title, subtitle } = buildCardText({
                      type: "serie",
                      titre: entry.titre_vf || entry.titre_vo,
                      episodeTitre: entry.episode_titre,
                      saison: entry.saison,
                      episodeNumero: entry.episode_numero,
                      metricLabel: formatDuration(entry.duree_minutes),
                    });
                    return (
                      <DateCard
                        key={`${entry.title_id}-${entry.saison}-${entry.episode_numero}-${idx}`}
                        href={buildEntityUrl("/titles", entry.title_id, entry.titre_vf || entry.titre_vo)}
                        imageUrl={entry.affiche_url}
                        title={title}
                        subtitle={subtitle ?? undefined}
                        date={entry.date_diffusion}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {undated.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Date inconnue ({undated.length})
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {undated.map((entry, idx) => {
                    const { title, subtitle } = buildCardText({
                      type: "serie",
                      titre: entry.titre_vf || entry.titre_vo,
                      episodeTitre: entry.episode_titre,
                      saison: entry.saison,
                      episodeNumero: entry.episode_numero,
                      metricLabel: formatDuration(entry.duree_minutes),
                    });
                    return (
                      <DateCard
                        key={`${entry.title_id}-${entry.saison}-${entry.episode_numero}-undated-${idx}`}
                        href={buildEntityUrl("/titles", entry.title_id, entry.titre_vf || entry.titre_vo)}
                        imageUrl={entry.affiche_url}
                        title={title}
                        subtitle={subtitle ?? undefined}
                        date={null}
                      />
                    );
                  })}
                </div>
              </div>
            )}

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

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageContent />
    </Suspense>
  );
}
