/**
 * Hook utilitaire qui retourne un Set des title_ids visionnés par l'utilisateur.
 * Utilisé pour afficher l'icone œil rouge sur les affiches.
 *
 * Correspondance backend : GET /watches
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { PaginationResult, UserWatch } from "@/lib/types/api";
import { useAuthStore } from "@/store/authStore";

type WatchesResponse = PaginationResult<UserWatch>;

export function useWatchedTitles() {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Set<string>>({
    queryKey: ["watched-titles-set"],
    queryFn: async (): Promise<Set<string>> => {
      const data = await apiFetch<WatchesResponse>(`/watches?limit=500`);
      const items = data.items ?? [];
      const set = new Set<string>();
      for (const watch of items) {
        if (watch.title_id) {
          set.add(watch.title_id);
        }
      }
      return set;
    },
    staleTime: 2 * 60 * 1000, // 2 min
    enabled: isAuthenticated,
  });
}