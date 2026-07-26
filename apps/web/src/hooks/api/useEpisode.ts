/**
 * Hook pour le détail d'un épisode (avec saison parente).
 * Correspondance backend : GET /episodes/:id (Phase 3.5)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { EpisodeDetail } from "@/lib/types/api";

export function useEpisode(id: string) {
  return useQuery({
    queryKey: ["episodes", id],
    queryFn: async (): Promise<EpisodeDetail> => {
      return apiFetch<EpisodeDetail>(`/episodes/${id}`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}
