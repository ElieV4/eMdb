/**
 * Hook API pour la liste des partages d'une liste (GET /lists/:listId/shares).
 * Phase 4.3 — Lists
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

type ListShare = {
  shared_with_user_id: string;
  permission: "lecture" | "edition";
  shared_at: string;
  users: { id: string; pseudo: string };
};

export function useShares(listId: string) {
  return useQuery<ListShare[]>({
    queryKey: ["shares", listId],
    queryFn: () => apiFetch<ListShare[]>(`/lists/${listId}/shares`),
    enabled: !!listId,
    staleTime: 2 * 60 * 1000,
  });
}