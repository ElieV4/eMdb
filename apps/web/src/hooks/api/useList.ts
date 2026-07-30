/**
 * Hook API pour le détail d'une liste (GET /lists/:id).
 * Phase 4.3 — Lists
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ListDetail } from "@/lib/types/api";

export function useList(listId: string) {
  return useQuery<ListDetail>({
    queryKey: ["list", listId],
    queryFn: () => apiFetch<ListDetail>(`/lists/${listId}`),
    enabled: !!listId,
    staleTime: 2 * 60 * 1000,
  });
}
