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
      // Set consommé par l'icone "vu" sur les affiches (bug lié au #45) —
      // sans ça, l'icone ne se met à jour qu'après un rechargement complet.
      queryClient.invalidateQueries({ queryKey: ["watched-titles-set"] });
    },
  });
}
