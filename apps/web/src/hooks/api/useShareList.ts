/**
 * Hook API pour partager une liste (POST /lists/:listId/shares).
 * Phase 4.3 — Lists
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ShareListInput } from "@/lib/types/api";

export function useShareList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      data,
    }: {
      listId: string;
      data: ShareListInput;
    }) =>
      apiFetch(`/lists/${listId}/shares`, {
        method: "POST",
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shares", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["shared-lists"] });
    },
  });
}