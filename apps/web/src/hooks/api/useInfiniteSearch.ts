/**
 * Hooks de recherche (titres/personnes) avec pagination infinie — variante
 * `useInfiniteQuery` de `useTitles`/`usePeople` pour le scroll infini sur
 * `/search`.
 *
 * `GET /titles/search`/`GET /people/search` transmettent `page` directement
 * à TMDB (`search/movie`, `search/tv`, `search/person` — ~20 résultats par
 * page et par source) et renvoient `{items, total}` — `total` reflète le
 * `total_results` réel de TMDB (stable quelle que soit la page interrogée),
 * pas seulement la portion déjà chargée. `getNextPageParam` continue
 * cependant à s'appuyer sur un seuil minimal plutôt qu'une correspondance
 * exacte à une taille de page (qui varie selon `type` : ~20 pour un type
 * filtré, jusqu'à ~40 pour "tout", film+série fusionnés).
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { TitleSearchResult, PersonSearchResult } from "@/lib/types/api";

type BackendTitleSearchResult = {
  tmdb_id: number;
  titre_vo: string;
  titre_vf: string | null;
  poster_path: string | null;
  type: "film" | "serie";
  local: boolean;
  local_id?: string;
};

type BackendPersonSearchResult = {
  tmdb_id: number;
  nom: string;
  photo_url: string | null;
  local: boolean;
  local_id?: string;
};

function mapTitle(item: BackendTitleSearchResult): TitleSearchResult {
  const id = item.local_id ?? String(item.tmdb_id);
  return {
    id,
    tmdbId: item.tmdb_id,
    titre: item.titre_vo,
    titreOriginal:
      item.titre_vf && item.titre_vf !== item.titre_vo ? item.titre_vf : undefined,
    type: item.type,
    afficheUrl: item.poster_path ?? undefined,
    local: item.local,
  };
}

function mapPerson(item: BackendPersonSearchResult): PersonSearchResult {
  const id = item.local_id ?? String(item.tmdb_id);
  return {
    id,
    tmdbId: item.tmdb_id,
    nom: item.nom,
    photoUrl: item.photo_url ?? undefined,
    local: item.local,
  };
}

// Seuil minimal en-deçà duquel on considère avoir atteint la fin des
// résultats TMDB — pas une correspondance exacte de taille de page (cf.
// note en tête de fichier).
const MIN_PAGE_THRESHOLD = 10;

export function useInfiniteTitleSearch(
  query: string,
  type?: "film" | "serie",
  enabled: boolean = true,
) {
  return useInfiniteQuery({
    queryKey: ["titles", "search", "infinite", query, type],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("q", query);
      if (type) params.set("type", type);
      params.set("page", String(pageParam));

      const data = await apiFetch<{ items: BackendTitleSearchResult[]; total: number }>(
        `/titles/search?${params.toString()}`,
      );
      return { items: data.items.map(mapTitle), page: pageParam, total: data.total };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.items.length >= MIN_PAGE_THRESHOLD ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!query,
  });
}

export function useInfinitePeopleSearch(query: string, enabled: boolean = true) {
  return useInfiniteQuery({
    queryKey: ["people", "search", "infinite", query],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("q", query);
      params.set("page", String(pageParam));

      const data = await apiFetch<{ items: BackendPersonSearchResult[]; total: number }>(
        `/people/search?${params.toString()}`,
      );
      return { items: data.items.map(mapPerson), page: pageParam, total: data.total };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.items.length >= MIN_PAGE_THRESHOLD ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!query,
  });
}
