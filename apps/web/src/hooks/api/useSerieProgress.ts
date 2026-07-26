/**
 * Hook API pour la progression d'une série (GET /titles/:titleId/progress).
 * Phase 4.1 — Watches
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ProgressSerieResult } from "@/lib/types/api";

export function useSerieProgress(titleId: string) {
  return useQuery<ProgressSerieResult[]>({
    queryKey: ["serie-progress", titleId],
    queryFn: () =>
      apiFetch<ProgressSerieResult[]>(`/titles/${titleId}/progress`),
    enabled: !!titleId,
    staleTime: 2 * 60 * 1000,
  });
}