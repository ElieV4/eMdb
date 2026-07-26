/**
 * Hook API pour la liste des listes de l'utilisateur (GET /lists).
 * Phase 4.3 — Lists
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { UserList } from "@/lib/types/api";

export function useLists(enabled: boolean = true) {
  return useQuery<UserList[]>({
    queryKey: ["lists"],
    queryFn: () => apiFetch<UserList[]>("/lists"),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}