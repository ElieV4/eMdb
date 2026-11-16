/**
 * Hook API pour quitter une liste partagée avec soi
 * (DELETE /shared-lists/:listId).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useLeaveSharedList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => apiFetch(`/shared-lists/${listId}`, { method: "DELETE" }),
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: ["shared-lists"] });
      queryClient.invalidateQueries({ queryKey: ["user-lists"] });
      queryClient.removeQueries({ queryKey: ["list", listId] });
    },
  });
}
