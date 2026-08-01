/**
 * Hook API pour le nombre de visionnages (GET /dataviz/watch-count).
 * Phase 6.1 — Dataviz
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import {
  DatavizQuery,
  WatchCountByPeriodRow,
  WatchCountByGenreRow,
  WatchCountByCountryRow,
  WatchCountByAnimationRow,
} from "@/lib/dataviz/types";

export type WatchCountRow =
  | WatchCountByPeriodRow
  | WatchCountByGenreRow
  | WatchCountByCountryRow
  | WatchCountByAnimationRow;

export function useWatchCount(query: DatavizQuery) {
  const { isAuthenticated } = useAuthStore();

  return useQuery<WatchCountRow[]>({
    queryKey: ["dataviz", "watch-count", query],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("groupBy", query.groupBy);
      if (query.yearFrom !== undefined) {
        searchParams.set("yearFrom", String(query.yearFrom));
      }
      if (query.yearTo !== undefined) {
        searchParams.set("yearTo", String(query.yearTo));
      }
      return apiFetch<WatchCountRow[]>(
        `/dataviz/watch-count?${searchParams.toString()}`,
      );
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
