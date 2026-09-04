/**
 * Hook pour les modules de la page "Découvrir" (modification G).
 * Correspondance backend : GET /discover/:module
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { TitleSearchResult } from "@/lib/types/api";

export type DiscoverModuleKey = "tendances" | "populaires" | "attendus" | "sorties";

type BackendDiscoverResult = {
  tmdb_id: number;
  titre_vo: string;
  titre_vf: string | null;
  poster_path: string | null;
  type: "film" | "serie";
  note_imdb: number | null;
  date_sortie: string | null;
  local: boolean;
  local_id?: string;
  duree_minutes?: number;
  nombre_episodes?: number;
};

function mapBackendDiscoverResult(item: BackendDiscoverResult): TitleSearchResult {
  const id = item.local_id ?? String(item.tmdb_id);
  return {
    id,
    tmdbId: item.tmdb_id,
    titre: item.titre_vo,
    titreOriginal:
      item.titre_vf && item.titre_vf !== item.titre_vo ? item.titre_vf : undefined,
    type: item.type,
    dateSortie: item.date_sortie ?? undefined,
    note: item.note_imdb ?? undefined,
    afficheUrl: item.poster_path ?? undefined,
    local: item.local,
    duree: item.duree_minutes,
    nombreEpisodes: item.nombre_episodes,
  };
}

export function useDiscoverModule(
  module: DiscoverModuleKey,
  limit: number = 20,
  appreciesFr: boolean = false,
) {
  return useQuery({
    queryKey: ["discover", module, limit, appreciesFr],
    queryFn: async (): Promise<TitleSearchResult[]> => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (appreciesFr) params.set("appreciesFr", "1");
      const data = await apiFetch<BackendDiscoverResult[]>(
        `/discover/${module}?${params.toString()}`,
      );
      return data.map(mapBackendDiscoverResult);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
