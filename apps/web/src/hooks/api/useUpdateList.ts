/**
 * Hook API pour modifier une liste (PATCH /lists/:id).
 * Phase 4.3 — Lists
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ListUpdateInput } from "@/lib/types/api";

export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: ListUpdateInput }) =>
      apiFetch(`/lists/${listId}`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list"] });
    },
  });
}
