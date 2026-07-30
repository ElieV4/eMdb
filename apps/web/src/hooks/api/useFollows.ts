/**
 * Hook API pour la liste des séries suivies (GET /follows).
 * Phase 4.4 — Follows
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { FollowDetail } from "@/lib/types/api";

export function useFollows() {
  return useQuery<FollowDetail[]>({
    queryKey: ["follows"],
    queryFn: () => apiFetch<FollowDetail[]>("/follows"),
    staleTime: 2 * 60 * 1000,
  });
}
