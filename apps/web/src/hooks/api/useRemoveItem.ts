/**
 * Hook API pour retirer un item d'une liste (DELETE /lists/:listId/items/:titleId).
 * Phase 4.3 — Lists
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useRemoveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, titleId }: { listId: string; titleId: string }) =>
      apiFetch(`/lists/${listId}/items/${titleId}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
    },
  });
}