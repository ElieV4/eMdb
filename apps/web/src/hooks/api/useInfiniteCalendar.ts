/**
 * Hook API pour le calendrier avec pagination infinie (GET /calendar,
 * page par page) — utilisé par la page dédiée /calendar pour charger tous
 * les épisodes à venir au fur et à mesure du scroll.
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { CalendarEntry, PaginationResult } from "@/lib/types/api";

const PAGE_SIZE = 100;

export function useInfiniteCalendar(enabled: boolean = true) {
  return useInfiniteQuery<PaginationResult<CalendarEntry>>({
    queryKey: ["calendar", "infinite"],
    queryFn: ({ pageParam }) =>
      apiFetch<PaginationResult<CalendarEntry>>(
        `/calendar?page=${pageParam}&limit=${PAGE_SIZE}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
