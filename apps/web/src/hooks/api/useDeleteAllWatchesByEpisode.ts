/**
 * Hook API pour supprimer tous les visionnages d'un épisode
 * (DELETE /watches/episode/:episodeId) — pendant de useDeleteAllWatches
 * (qui ne couvre que les titres), modification M.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useDeleteAllWatchesByEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (episodeId: string) =>
      apiFetch(`/watches/episode/${episodeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["serie-progress"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["continue-watching"] });
      queryClient.invalidateQueries({ queryKey: ["watched-titles-set"] });
    },
  });
}
