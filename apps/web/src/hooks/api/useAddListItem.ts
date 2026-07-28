/**
 * Hook API pour ajouter un titre à une liste.
 * Correspondance backend : POST /lists/:listId/items
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useAddListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, titleId }: { listId: string; titleId: string }) =>
      apiFetch(`/lists/${listId}/items`, {
        method: "POST",
        body: { title_id: titleId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-lists"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}
