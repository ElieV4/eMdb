/**
 * Affiche la liste des épisodes d'une saison avec actions rapides.
 * Utilisé dans SeasonCompact pour affichage développé.
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSeason } from "@/hooks/api/useSeason";
import { useWatches } from "@/hooks/api/useWatches";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { cn } from "@/lib/utils";
import { WatchButton } from "@/components/watches/WatchButton";
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

  // Fetch all watches to determine which episodes are watched
  const { data: watchesData } = useWatches({
    limit: 100,
  });
  const deleteWatch = useDeleteWatch();

  const episodeList = seasonData?.episodes ?? [];
  const allWatches = watchesData?.items ?? [];

  // Build a map of episode_id -> watches array
  const episodeWatchMap = new Map<string, string[]>();
  for (const watch of allWatches) {
    if (watch.episode_id) {
      const existing = episodeWatchMap.get(watch.episode_id) ?? [];
      existing.push(watch.id);
      episodeWatchMap.set(watch.episode_id, existing);
    }
  }

  const handleWatchSuccess = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["watches"],
      exact: false,
    });
  };

  const handleDeleteAll = async (episodeId: string) => {
    const watchIds = episodeWatchMap.get(episodeId) ?? [];
    for (const watchId of watchIds) {
      await deleteWatch.mutateAsync(watchId);
    }
    // Invalidate after all deletions
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
        const watchIds = episodeWatchMap.get(episode.id) ?? [];
        const watchCount = watchIds.length;
        const isWatched = watchCount > 0;
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
                  onWatchSuccess={handleWatchSuccess}
                  watched={isWatched}
                  watchCount={watchCount}
                  onDeleteAll={() => handleDeleteAll(episode.id)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}