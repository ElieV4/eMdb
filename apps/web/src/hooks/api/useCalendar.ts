/**
 * Hook API pour le calendrier des épisodes non vus (GET /calendar).
 * Phase 4.1 — Watches
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { CalendarEntry } from "@/lib/types/api";

export function useCalendar() {
  return useQuery<CalendarEntry[]>({
    queryKey: ["calendar"],
    queryFn: () => apiFetch<CalendarEntry[]>("/calendar"),
    staleTime: 2 * 60 * 1000,
  });
}