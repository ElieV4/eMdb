/**
 * Hook API pour ajouter un item à une liste (POST /lists/:listId/items).
 * Phase 4.3 — Lists
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ListItemAddInput } from "@/lib/types/api";

export function useAddItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      data,
    }: {
      listId: string;
      data: ListItemAddInput;
    }) =>
      apiFetch(`/lists/${listId}/items`, {
        method: "POST",
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
    },
  });
}
