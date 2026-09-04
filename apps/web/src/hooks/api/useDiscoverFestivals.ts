/**
 * Hooks pour le module "Sélection" de la page Découvrir (festivals de
 * cinéma / cérémonies récentes, alimenté par Wikidata côté backend).
 * Correspondance backend : GET /discover/festivals, GET /discover/festivals/:editionId
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { TitleSearchResult } from "@/lib/types/api";

export interface FestivalEdition {
  sourceQid: string;
  sourceNom: string;
  kind: "festival" | "awards";
  editionId: string;
  editionLabel: string;
  annee: number;
  date: string | null;
}

export interface FestivalNominee extends TitleSearchResult {
  categorie: string | null;
  gagnant: boolean;
}

type BackendFestivalNominee = {
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
  categorie: string | null;
  gagnant: boolean;
};

function mapNominee(item: BackendFestivalNominee): FestivalNominee {
  const id = item.local_id ?? String(item.tmdb_id);
  return {
    id,
    tmdbId: item.tmdb_id,
    titre: item.titre_vo,
    titreOriginal: item.titre_vf && item.titre_vf !== item.titre_vo ? item.titre_vf : undefined,
    type: item.type,
    dateSortie: item.date_sortie ?? undefined,
    note: item.note_imdb ?? undefined,
    afficheUrl: item.poster_path ?? undefined,
    local: item.local,
    duree: item.duree_minutes,
    nombreEpisodes: item.nombre_episodes,
    categorie: item.categorie,
    gagnant: item.gagnant,
  };
}

export function useFestivalEditions() {
  return useQuery({
    queryKey: ["discover", "festivals"],
    queryFn: () => apiFetch<FestivalEdition[]>("/discover/festivals"),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

export function useFestivalSelection(editionId: string | undefined) {
  return useQuery({
    queryKey: ["discover", "festivals", editionId],
    queryFn: async (): Promise<FestivalNominee[]> => {
      const data = await apiFetch<BackendFestivalNominee[]>(
        `/discover/festivals/${encodeURIComponent(editionId!)}`,
      );
      return data.map(mapNominee);
    },
    // "on demand" : ne charge la sélection (potentiellement coûteuse — un
    // appel TMDB par titre côté backend) que quand une édition est choisie.
    enabled: !!editionId,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}
