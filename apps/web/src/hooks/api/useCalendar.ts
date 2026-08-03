/**
 * Hook API pour le calendrier des épisodes non vus (GET /calendar).
 * Phase 4.1 — Watches
 *
 * `GET /calendar` est paginé côté backend (page/limit) pour permettre le
 * scroll infini sur la page dédiée `/calendar` (cf. `useInfiniteCalendar`) —
 * ce hook-ci reste un aperçu simple (une seule page) pour le slider accueil,
 * qui n'a jamais besoin de plus qu'une centaine d'épisodes à venir.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { CalendarEntry, PaginationResult } from "@/lib/types/api";

export function useCalendar(enabled: boolean = true) {
  return useQuery<CalendarEntry[]>({
    queryKey: ["calendar"],
    queryFn: async () => {
      const data = await apiFetch<PaginationResult<CalendarEntry>>("/calendar?limit=100");
      return data.items;
    },
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
