/**
 * Hook API pour la liste des notes de l'utilisateur (GET /ratings).
 * Phase 4.2 — Ratings
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { PaginationResult, UserRating } from "@/lib/types/api";

type UserRatingsResponse = PaginationResult<UserRating>;

type UserRatingsFilters = {
  type?: "film" | "serie";
  page?: number;
  limit?: number;
};

export function useUserRatings(filters?: UserRatingsFilters) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();

  return useQuery<UserRatingsResponse>({
    queryKey: ["user-ratings", filters],
    queryFn: () =>
      apiFetch<UserRatingsResponse>(`/ratings${qs ? `?${qs}` : ""}`),
    staleTime: 2 * 60 * 1000,
  });
}