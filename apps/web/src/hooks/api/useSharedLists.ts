/**
 * Hook API pour les listes partagées avec l'utilisateur (GET /shared-lists).
 * Phase 4.3 — Lists
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

type SharedList = {
  id: string;
  nom: string;
  type: "watchlist" | "favoris" | "custom";
  description?: string | null;
  user_id: string;
  users: { id: string; pseudo: string };
  permission: "lecture" | "edition";
};

export function useSharedLists() {
  return useQuery<SharedList[]>({
    queryKey: ["shared-lists"],
    queryFn: () => apiFetch<SharedList[]>("/shared-lists"),
    staleTime: 2 * 60 * 1000,
  });
}