/**
 * Hook pour le détail d'une saison (avec épisodes).
 * Correspondance backend : GET /titles/:titleId/seasons/:numero (Phase 3.5)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { SeasonWithEpisodes } from "@/lib/types/api";

export function useSeason(titleId: string, numero: number) {
  return useQuery({
    queryKey: ["titles", titleId, "seasons", numero],
    queryFn: async (): Promise<SeasonWithEpisodes> => {
      return apiFetch<SeasonWithEpisodes>(
        `/titles/${titleId}/seasons/${numero}`,
      );
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!titleId && numero > 0,
  });
}
