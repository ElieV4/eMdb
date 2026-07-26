/**
 * Hook pour les crédits d'un titre (cast/crew groupés par rôle).
 * Correspondance backend : GET /titles/:titleId/credits (Phase 3.6)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { CreditGrouped } from "@/lib/types/api";

export function useTitleCredits(titleId: string) {
  return useQuery({
    queryKey: ["titles", titleId, "credits"],
    queryFn: async (): Promise<CreditGrouped> => {
      return apiFetch<CreditGrouped>(`/titles/${titleId}/credits`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!titleId,
  });
}
