/**
 * Hook utilitaire qui retourne un Set des title_ids des séries suivies par l'utilisateur.
 * Utilisé pour afficher l'icone bookmark sur les affiches.
 *
 * Correspondance backend : GET /follows
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

// GET /follows renvoie directement les champs du titre suivi (id = l'id du
// titre lui-même), pas un objet de liaison avec un champ `title_id` séparé.
type FollowEntry = {
  id: string;
  followed_at: string;
};

export function useFollowedTitleIds() {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Set<string>>({
    queryKey: ["followed-title-ids-set"],
    queryFn: async (): Promise<Set<string>> => {
      const data = await apiFetch<FollowEntry[]>(`/follows`);
      const set = new Set<string>();
      for (const follow of data) {
        if (follow.id) {
          set.add(follow.id);
        }
      }
      return set;
    },
    staleTime: 2 * 60 * 1000, // 2 min
    enabled: isAuthenticated,
  });
}