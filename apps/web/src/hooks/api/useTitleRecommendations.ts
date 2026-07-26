/**
 * Hook pour les recommandations d'un titre.
 * Correspondance backend : GET /titles/:id/recommendations (Phase 3.3)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { TitleRecommendation } from "@/lib/types/api";

export function useTitleRecommendations(id: string) {
  return useQuery({
    queryKey: ["titles", id, "recommendations"],
    queryFn: async (): Promise<TitleRecommendation[]> => {
      return apiFetch<TitleRecommendation[]>(`/titles/${id}/recommendations`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}
