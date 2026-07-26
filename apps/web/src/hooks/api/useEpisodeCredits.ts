/**
 * Hook pour les crédits d'un épisode (guest stars/crew groupés par rôle).
 * Correspondance backend : GET /episodes/:id/credits (Phase 3.5)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { CreditGrouped } from "@/lib/types/api";

export function useEpisodeCredits(id: string) {
  return useQuery({
    queryKey: ["episodes", id, "credits"],
    queryFn: async (): Promise<CreditGrouped> => {
      return apiFetch<CreditGrouped>(`/episodes/${id}/credits`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}
