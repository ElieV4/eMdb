/**
 * Hook pour la liste des saisons d'un titre.
 * Correspondance backend : GET /titles/:titleId/seasons (Phase 3.5)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { SeasonSummary } from "@/lib/types/api";

export function useSeasons(titleId: string) {
  return useQuery({
    queryKey: ["titles", titleId, "seasons"],
    queryFn: async (): Promise<SeasonSummary[]> => {
      return apiFetch<SeasonSummary[]>(`/titles/${titleId}/seasons`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!titleId,
  });
}
