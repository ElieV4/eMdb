/**
 * Hook API pour le temps de visionnage (GET /dataviz/watch-time).
 * Phase 6.1 — Dataviz
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import {
  DatavizQuery,
  WatchTimeByPeriodRow,
  WatchTimeByGenreRow,
  WatchTimeByCountryRow,
  WatchTimeByAnimationRow,
} from "@/lib/dataviz/types";

export type WatchTimeRow =
  | WatchTimeByPeriodRow
  | WatchTimeByGenreRow
  | WatchTimeByCountryRow
  | WatchTimeByAnimationRow;

export function useWatchTime(query: DatavizQuery) {
  const { isAuthenticated } = useAuthStore();

  return useQuery<WatchTimeRow[]>({
    queryKey: ["dataviz", "watch-time", query],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("groupBy", query.groupBy);
      if (query.yearFrom !== undefined) {
        searchParams.set("yearFrom", String(query.yearFrom));
      }
      if (query.yearTo !== undefined) {
        searchParams.set("yearTo", String(query.yearTo));
      }
      return apiFetch<WatchTimeRow[]>(
        `/dataviz/watch-time?${searchParams.toString()}`,
      );
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
