/**
 * Hook API pour les listes de l'utilisateur.
 * Correspondance backend : GET /lists?title_id=xxx
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { PublicUser } from "@/lib/types/api";

/**
 * Listes où l'utilisateur peut ajouter un titre : les siennes, plus les
 * listes partagées avec lui en mode "ouvert" (`shared: true`, avec `owner`).
 */
export type UserList = {
  id: string;
  user_id: string;
  nom: string;
  type: "watchlist" | "favoris" | "custom";
  description?: string | null;
  created_at: string;
  contains_title?: boolean;
  shared?: boolean;
  owner?: PublicUser;
};

export function useUserLists(titleId?: string) {
  return useQuery<UserList[]>({
    queryKey: ["user-lists", titleId],
    queryFn: async (): Promise<UserList[]> => {
      const qs = titleId ? `?title_id=${titleId}` : "";
      return apiFetch<UserList[]>(`/lists${qs}`);
    },
    staleTime: 2 * 60 * 1000,
  });
}
