/**
 * Hook API pour supprimer un watch (DELETE /watches/:id).
 * Phase 4.1 — Watches
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useDeleteWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (watchId: string) =>
      apiFetch(`/watches/${watchId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}