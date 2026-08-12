/**
 * Hook utilitaire qui retourne un Set des title_ids visionnés par l'utilisateur.
 * Utilisé pour afficher l'icone œil rouge sur les affiches.
 *
 * Correspondance backend : GET /watches/watched-title-ids — ensemble complet
 * (titre direct OU via épisode), non paginé. Un ancien fallback sur
 * `/watches?limit=100` ne remontait que les 100 visionnages les plus
 * récents et ignorait `title_id === null` (visionnages par épisode) : les
 * séries vues via épisode et les titres à l'historique volumineux
 * (notamment après un import Trakt) n'affichaient jamais l'icone "vu".
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

export function useWatchedTitles() {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Set<string>>({
    queryKey: ["watched-titles-set"],
    queryFn: async (): Promise<Set<string>> => {
      const titleIds = await apiFetch<string[]>(`/watches/watched-title-ids`);
      return new Set(titleIds);
    },
    staleTime: 2 * 60 * 1000, // 2 min
    enabled: isAuthenticated,
  });
}