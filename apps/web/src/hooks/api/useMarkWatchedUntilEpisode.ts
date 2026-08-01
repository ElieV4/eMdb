/**
 * Hook API pour "Vu jusqu'ici" (modification M) — POST /watches/until-episode.
 * Marque comme vus tous les épisodes non encore vus d'une série jusqu'à
 * l'épisode donné inclus.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useMarkWatchedUntilEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { episode_id: string; date_vue?: string }) =>
      apiFetch<{ count: number }>("/watches/until-episode", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["serie-progress"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["watched-titles-set"] });
    },
  });
}
