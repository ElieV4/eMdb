/**
 * Hook API pour retirer un membre d'une liste
 * (DELETE /lists/:listId/shares/:userId). Créateur uniquement.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useRemoveShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, userId }: { listId: string; userId: string }) =>
      apiFetch(`/lists/${listId}/shares/${userId}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shares", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}
