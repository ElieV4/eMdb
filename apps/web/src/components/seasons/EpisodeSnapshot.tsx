/**
 * Affiche la liste des épisodes d'une saison avec actions rapides.
 * Utilisé dans SeasonCompact pour affichage développé.
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Clock } from "lucide-react";
import { useSeason } from "@/hooks/api/useSeason";
import { useWatches } from "@/hooks/api/useWatches";
import { cn } from "@/lib/utils";
import { WatchButton } from "@/components/watches/WatchButton";
import { HistoryDialogWatch } from "@/components/watches/HistoryDialog";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

interface EpisodeSnapshotProps {
  titleId: string;
  seasonNumber: number;
  seasonId: string;
  className?: string;
}

// Note: seasonId is kept for potential future use (e.g., episode credits)

export function EpisodeSnapshot({
  titleId,
  seasonNumber,
  seasonId: _seasonId,
  className,
}: EpisodeSnapshotProps) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    data: seasonData,
    isLoading,
    isError,
  } = useSeason(titleId, seasonNumber);

  // Fetch all watches to determine which episodes are watched — un seul
  // appel pour toute la saison plutôt qu'un par épisode (le nombre
  // d'épisodes rend un fetch par bouton coûteux).
  const { data: watchesData } = useWatches({
    limit: 100,
  });

  const episodeList = seasonData?.episodes ?? [];
  const allWatches = watchesData?.items ?? [];

  // Regroupe les visionnages par épisode (id + date, pour HistoryDialog).
  const episodeWatchMap = new Map<string, HistoryDialogWatch[]>();
  for (const watch of allWatches) {
    if (watch.episode_id) {
      const existing = episodeWatchMap.get(watch.episode_id) ?? [];
      existing.push({ id: watch.id, date_vue: watch.date_vue });
      episodeWatchMap.set(watch.episode_id, existing);
    }
  }

  // "Vu jusqu'ici" (modification M) doit aussi cocher les épisodes
  // précédents de cette même liste : simple invalidation du cache partagé
  // `["watches"]", déjà fait par chaque mutation watch — le re-fetch qui
  // suit met à jour `episodeWatchMap` ci-dessus pour tous les boutons.
  const handleWatchChanged = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["watches"],
      exact: false,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || episodeList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucun épisode disponible pour cette saison.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {episodeList.map((episode) => {
        const episodeWatches = episodeWatchMap.get(episode.id) ?? [];
        const dateStr = episode.date_sortie
          ? new Date(episode.date_sortie).toLocaleDateString("fr-FR")
          : null;
        return (
          <div
            key={episode.id}
            className="flex items-center justify-between rounded-md border bg-background p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                Épisode {episode.numero}
                {episode.titre ? ` - ${episode.titre}` : ""}
              </p>
              {(dateStr || episode.duree_minutes) && (
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  {dateStr && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {dateStr}
                    </span>
                  )}
                  {episode.duree_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {episode.duree_minutes} min
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3">
              <Link
                href={`/episodes/${episode.id}`}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                title="Voir la page de l'épisode"
              >
                <Plus className="h-3 w-3" />
              </Link>
              {isAuthenticated && (
                <WatchButton
                  episodeId={episode.id}
                  releaseDate={episode.date_sortie}
                  watches={episodeWatches}
                  onChanged={handleWatchChanged}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}