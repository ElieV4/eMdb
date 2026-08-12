/**
 * Hook API pour la liste des personnes suivies (GET /people/followed).
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { FollowedPerson } from "@/lib/types/api";

export function useFollowedPeople(enabled: boolean = true) {
  return useQuery<FollowedPerson[]>({
    queryKey: ["people", "followed"],
    queryFn: () => apiFetch<FollowedPerson[]>("/people/followed"),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
