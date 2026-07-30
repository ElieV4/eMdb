/**
 * Hook API pour ne plus suivre une série (DELETE /follows/:titleId).
 * Phase 4.4 — Follows
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useUnfollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (titleId: string) =>
      apiFetch(`/follows/${titleId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follows"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
