/**
 * Hook API pour supprimer tous les visionnages d'un titre (DELETE /watches/title/:titleId).
 * Phase 4.1 — Watches
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useDeleteAllWatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (titleId: string) =>
      apiFetch(`/watches/title/${titleId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["serie-progress"] });
    },
  });
}