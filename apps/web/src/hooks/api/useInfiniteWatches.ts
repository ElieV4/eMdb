/**
 * Hook API pour la liste des visionnages avec pagination infinie
 * (GET /watches, page par page) — utilisé par /history pour charger tout
 * l'historique au fur et à mesure du scroll plutôt qu'un unique appel
 * plafonné à 100 éléments (`ListWatchesFilterDto`, limite max autorisée).
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { PaginationResult, UserWatch, WatchFilters } from "@/lib/types/api";

type WatchesResponse = PaginationResult<UserWatch>;

const PAGE_SIZE = 100; // limite max autorisée côté backend

export function useInfiniteWatches(
  filters?: Omit<WatchFilters, "page" | "limit">,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery<WatchesResponse>({
    queryKey: ["watches", "infinite", filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      if (filters?.date_from) params.set("date_from", filters.date_from);
      if (filters?.date_to) params.set("date_to", filters.date_to);
      if (filters?.title_id) params.set("title_id", filters.title_id);
      if (filters?.episode_id) params.set("episode_id", filters.episode_id);
      params.set("page", String(pageParam));
      params.set("limit", String(PAGE_SIZE));

      return apiFetch<WatchesResponse>(`/watches?${params.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled,
  });
}
