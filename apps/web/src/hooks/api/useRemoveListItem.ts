/**
 * Hook API pour retirer un titre d'une liste.
 * Correspondance backend : DELETE /lists/:listId/items/:titleId
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useRemoveListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, titleId }: { listId: string; titleId: string }) =>
      apiFetch(`/lists/${listId}/items/${titleId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-lists"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}
