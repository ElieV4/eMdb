/**
 * Hook pour les recommandations d'une personne.
 * Correspondance backend : GET /people/:id/recommendations (Phase 3.4)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { PersonRecommendation } from "@/lib/types/api";

export function usePersonRecommendations(id: string) {
  return useQuery({
    queryKey: ["people", id, "recommendations"],
    queryFn: async (): Promise<PersonRecommendation[]> => {
      return apiFetch<PersonRecommendation[]>(
        `/people/${id}/recommendations`,
      );
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}
