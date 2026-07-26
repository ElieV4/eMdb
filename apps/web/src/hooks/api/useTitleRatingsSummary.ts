/**
 * Hook API pour le résumé public des notes d'un titre (GET /titles/:id/ratings).
 * Phase 4.2 — Ratings
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { TitleRatingsSummary } from "@/lib/types/api";

export function useTitleRatingsSummary(titleId: string) {
  return useQuery<TitleRatingsSummary>({
    queryKey: ["title-ratings-summary", titleId],
    queryFn: () =>
      apiFetch<TitleRatingsSummary>(`/titles/${titleId}/ratings`),
    enabled: !!titleId,
    staleTime: 5 * 60 * 1000,
  });
}