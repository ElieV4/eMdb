/**
 * Hook API pour suivre une série (POST /follows).
 * Phase 4.4 — Follows
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export function useFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (titleId: string) =>
      apiFetch("/follows", {
        method: "POST",
        body: { title_id: titleId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follows"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
