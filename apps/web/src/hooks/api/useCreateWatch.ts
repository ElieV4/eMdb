/**
 * Hook API pour créer un watch (POST /watches).
 * Phase 4.1 — Watches
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { WatchCreateInput } from "@/lib/types/api";

export function useCreateWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WatchCreateInput) =>
      apiFetch("/watches", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["serie-progress"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
