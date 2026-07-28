/**
 * Hook API pour les listes de l'utilisateur.
 * Correspondance backend : GET /lists
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type UserList = {
  id: string;
  user_id: string;
  nom: string;
  type: "watchlist" | "favoris" | "custom";
  description?: string | null;
  created_at: string;
};

export function useUserLists() {
  return useQuery<UserList[]>({
    queryKey: ["user-lists"],
    queryFn: async (): Promise<UserList[]> => {
      return apiFetch<UserList[]>("/lists");
    },
    staleTime: 2 * 60 * 1000,
  });
}
