/**
 * Hook API pour la liste des visionnages (GET /watches).
 * Phase 4.1 — Watches
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { PaginationResult, UserWatch, WatchFilters } from "@/lib/types/api";

type WatchesResponse = PaginationResult<UserWatch>;

export function useWatches(filters?: WatchFilters) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);
  if (filters?.title_id) params.set("title_id", filters.title_id);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();

  return useQuery<WatchesResponse>({
    queryKey: ["watches", filters],
    queryFn: () => apiFetch<WatchesResponse>(`/watches${qs ? `?${qs}` : ""}`),
    staleTime: 2 * 60 * 1000, // 2 min
  });
}
