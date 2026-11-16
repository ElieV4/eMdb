/**
 * Hook API pour les membres d'une liste (GET /lists/:listId/shares).
 * Réservé au créateur de la liste (403 sinon) : n'activer que si
 * `capabilities.canManageShares`.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ListMember } from "@/lib/types/api";

export function useShares(listId: string, enabled = true) {
  return useQuery<ListMember[]>({
    queryKey: ["shares", listId],
    queryFn: () => apiFetch<ListMember[]>(`/lists/${listId}/shares`),
    enabled: !!listId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}
