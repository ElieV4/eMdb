/**
 * Colonnes complémentaires de la vue tableau (POST /titles/table-info) :
 * réalisation, ma note, durée, nombre d'épisodes, pour les titres locaux
 * affichés. Les titres TMDB pas encore importés n'ont pas ces données.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";

export type TitleTableInfo = {
  realisateurs: { id: string; nom: string }[];
  notePerso: number | null;
  duree: number | null;
  nombreEpisodes: number | null;
  dateSortie: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useTitlesTableInfo(titleIds: string[], enabled = true) {
  const ids = [...new Set(titleIds.filter((id) => UUID.test(id)))].sort();
  return useQuery<Record<string, TitleTableInfo>>({
    queryKey: ["titles-table-info", ids],
    queryFn: () =>
      apiFetch<Record<string, TitleTableInfo>>("/titles/table-info", {
        method: "POST",
        body: { title_ids: ids.slice(0, 1000) },
        timeoutMs: 30_000,
      }),
    enabled: enabled && ids.length > 0,
    staleTime: 60 * 1000,
  });
}
