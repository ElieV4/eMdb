/**
 * Hook API pour le module accueil "Continuer à regarder" (modification U).
 * GET /continue-watching
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { ContinueWatchingEntry } from "@/lib/types/api";

export function useContinueWatching(enabled: boolean = true) {
  return useQuery<ContinueWatchingEntry[]>({
    queryKey: ["continue-watching"],
    queryFn: () => apiFetch<ContinueWatchingEntry[]>("/continue-watching"),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
