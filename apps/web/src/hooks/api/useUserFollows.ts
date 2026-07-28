/**
 * Hook API pour vérifier si une série est suivie par l'utilisateur.
 * Correspondance backend : GET /follows
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type Follow = {
  user_id: string;
  title_id: string;
  followed_at: string;
};

export function useUserFollows() {
  return useQuery<Follow[]>({
    queryKey: ["follows"],
    queryFn: async (): Promise<Follow[]> => {
      return apiFetch<Follow[]>("/follows");
    },
    staleTime: 2 * 60 * 1000,
  });
}
