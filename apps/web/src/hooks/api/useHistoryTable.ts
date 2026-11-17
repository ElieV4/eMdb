/**
 * Hooks de la vue tableau de l'historique (GET /watches/table) et de
 * l'édition d'un visionnage (PATCH /watches/:id : date et contexte).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { HistoryTableResponse } from "@/lib/historyTable";

export const HISTORY_TABLE_KEY = ["history-table"] as const;

export function useHistoryTable(enabled = true) {
  return useQuery<HistoryTableResponse>({
    queryKey: HISTORY_TABLE_KEY,
    // Tout l'historique d'un coup (jusqu'à 5000 visionnages) : bien plus
    // long que le délai par défaut d'apiFetch (10 s) pour un gros historique.
    queryFn: () => apiFetch<HistoryTableResponse>("/watches/table", { timeoutMs: 60_000 }),
    enabled,
    staleTime: 60 * 1000,
  });
}

export type WatchPatch = {
  date_vue?: string;
  support?: string | null;
  compagnie?: string | null;
  emotion?: string[] | null;
};

export function useUpdateWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ watchId, patch }: { watchId: string; patch: WatchPatch }) =>
      apiFetch(`/watches/${watchId}`, { method: "PATCH", body: patch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HISTORY_TABLE_KEY });
      queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
    },
  });
}
