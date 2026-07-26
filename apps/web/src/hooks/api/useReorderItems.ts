/**
 * Hook API pour réordonnancer les items d'une liste (PATCH /lists/:listId/items/reorder).
 * Phase 4.3 — Lists
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

type ReorderItem = {
  title_id: string;
  position: number;
};

export function useReorderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      items,
    }: {
      listId: string;
      items: ReorderItem[];
    }) =>
      apiFetch(`/lists/${listId}/items/reorder`, {
        method: "PATCH",
        body: { items },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
    },
  });
}