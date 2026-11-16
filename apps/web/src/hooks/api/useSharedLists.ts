/**
 * Hook API pour les listes partagées avec l'utilisateur (GET /shared-lists).
 * Chaque entrée porte le mode de partage et les droits qui en découlent.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { SharedListEntry } from "@/lib/types/api";

export function useSharedLists(enabled = true) {
  return useQuery<SharedListEntry[]>({
    queryKey: ["shared-lists"],
    queryFn: () => apiFetch<SharedListEntry[]>("/shared-lists"),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
