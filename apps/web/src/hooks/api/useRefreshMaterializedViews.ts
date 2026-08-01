/**
 * Hook API pour le refresh manuel des vues matérialisées (Phase 6.2).
 * POST /admin/refresh-materialized-views — réservé aux administrateurs.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type RefreshMaterializedViewsResult = {
  jobId?: string;
  status: string;
  message: string;
};

export function useRefreshMaterializedViews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<RefreshMaterializedViewsResult>(
        "/admin/refresh-materialized-views",
        { method: "POST" },
      ),
    onSuccess: () => {
      // Invalide les requêtes dataviz pour forcer un refetch après refresh.
      queryClient.invalidateQueries({ queryKey: ["dataviz"] });
    },
  });
}
