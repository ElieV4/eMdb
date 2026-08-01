/**
 * Page historique : visionnages de l'utilisateur.
 * Route : /history
 * Backend : GET /watches
 *
 * Format inspiré du widget Outlook Android (modification J) : filtre de
 * période en haut de page, titres groupés par période choisie.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useWatches } from "@/hooks/api/useWatches";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { useLists } from "@/hooks/api/useLists";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import { DateCard } from "@/components/common/DateCard";
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
  const { data, isLoading, error } = useWatches({
    limit: 100,
    type: filters.type !== "tout" ? filters.type : undefined,
  });
  const { data: lists } = useLists(isAuthenticated);
  const listIdsByTitle = buildListIdsByTitle(lists);
  const deleteWatch = useDeleteWatch();

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

  // Filtre "Listes" et "vu / tout / non vu" (menu filtres, absent jusqu'ici
  // sur l'historique) : appliqués côté client, les visionnages n'étant filtrables
  // côté serveur que par type.
  const filteredWatches = (data?.items ?? []).filter((watch) => {
    if (filters.watchedStatus === "non_vu") return false; // tout l'historique est déjà "vu"
    if (filters.listIds.length === 0) return true;
    const watchLists = listIdsByTitle.get(watch.title_id) ?? [];
    return filters.listIds.some((id) => watchLists.includes(id));
  });

  const groups = groupByPeriod<UserWatch>(
    filteredWatches,
    period,
    (watch) => new Date(watch.date_vue),
    true, // plus récent en premier
  );

  const hasActiveFilter =
    filters.type !== "tout" || filters.listIds.length > 0 || filters.watchedStatus !== "tout";

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
                    const label = watch.episodes
                      ? `${watch.titles?.titre_vf || watch.titles?.titre_vo || "Série"} — Épisode ${watch.episodes.numero}`
                      : watch.titles?.titre_vf || watch.titles?.titre_vo || "Titre inconnu";
                    const href = watch.episodes
                      ? `/episodes/${watch.episodes.id}`
                      : `/titles/${watch.title_id}`;

                    return (
                      <DateCard
                        key={watch.id}
                        href={href}
                        imageUrl={watch.titles?.affiche_url}
                        title={label}
                        date={watch.date_vue}
                        onRemove={() => deleteWatch.mutate(watch.id)}
                        removeLabel="Retirer de l'historique"
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
