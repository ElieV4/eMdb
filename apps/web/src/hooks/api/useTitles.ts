/**
 * Hooks pour la gestion des titres (films et séries).
 * Correspondance backend : Phase 3.3 (Titles)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import {
  Title,
  TitleDetail,
  PaginationResult,
  TitleSearchResult,
} from "@/lib/types/api";

// ============================================
// Types backend (snake_case) pour la recherche
// ============================================

type BackendTitleSearchResult = {
  tmdb_id: number;
  titre_vo: string;
  titre_vf: string | null;
  poster_path: string | null;
  type: "film" | "serie";
  local: boolean;
  local_id?: string;
};

// ============================================
// Types étendus pour les réponses API
// ============================================

export type TitlesSearchParams = {
  query?: string;
  type?: "film" | "serie";
  genre?: string;
  country?: string;
  year?: number;
  page?: number;
  limit?: number;
};

export type TitlesSearchResponse = PaginationResult<TitleSearchResult>;

// ============================================
// Transformation backend → frontend
// ============================================

function mapBackendTitleToSearchResult(
  item: BackendTitleSearchResult,
): TitleSearchResult {
  const id = item.local_id ?? String(item.tmdb_id);
  return {
    id,
    tmdbId: item.tmdb_id,
    titre: item.titre_vo,
    titreOriginal:
      item.titre_vf && item.titre_vf !== item.titre_vo
        ? item.titre_vf
        : undefined,
    type: item.type,
    afficheUrl: item.poster_path ?? undefined,
    local: item.local,
  };
}

// ============================================
// Hook : Recherche de titres
// ============================================

export function useTitles(params: TitlesSearchParams = {}) {
  const { query, type, genre, country, year, page = 1, limit = 20 } = params;

  return useQuery({
    queryKey: [
      "titles",
      "search",
      query,
      type,
      genre,
      country,
      year,
      page,
      limit,
    ],
    queryFn: async (): Promise<TitlesSearchResponse> => {
      const searchParams = new URLSearchParams();
      if (query) searchParams.set("q", query);
      if (type) searchParams.set("type", type);
      if (genre) searchParams.set("genre", genre);
      if (country) searchParams.set("country", country);
      if (year) searchParams.set("year", year.toString());
      searchParams.set("page", page.toString());
      searchParams.set("limit", limit.toString());

      const data = await apiFetch<BackendTitleSearchResult[]>(
        `/titles/search?${searchParams.toString()}`,
      );

      const items = data.map(mapBackendTitleToSearchResult);

      return {
        items,
        total: items.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(items.length / limit)),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    enabled: !!query,
  });
}

// ============================================
// Hook : Détail d'un titre
// ============================================

export function useTitle(id: string) {
  return useQuery({
    queryKey: ["titles", "detail", id],
    queryFn: async (): Promise<TitleDetail> => {
      return apiFetch<TitleDetail>(`/titles/${id}`);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}

// ============================================
// Hook : Liste des titres (sans recherche)
// ============================================

export function useTrendingTitles(type?: "film" | "serie", limit: number = 10) {
  return useQuery({
    queryKey: ["titles", "trending", type, limit],
    queryFn: async (): Promise<Title[]> => {
      const searchParams = new URLSearchParams();
      if (type) searchParams.set("type", type);
      searchParams.set("limit", limit.toString());
      searchParams.set("sortBy", "popularity");
      searchParams.set("sortOrder", "desc");

      const response = await apiFetch<PaginationResult<Title>>(
        `/titles?${searchParams.toString()}`,
      );
      return response.items;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes (données moins fréquentes)
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================
// Hooks : listes de référence pour les menus de filtre (bug #28/#34)
// ============================================

export function useTitleGenres() {
  return useQuery({
    queryKey: ["titles", "genres"],
    queryFn: () => apiFetch<{ id: string; nom: string }[]>("/titles/genres"),
    staleTime: 60 * 60 * 1000, // 1h — quasi-statique
  });
}

export function useTitleCountries() {
  return useQuery({
    queryKey: ["titles", "countries"],
    queryFn: () => apiFetch<{ id: string; nom: string }[]>("/titles/countries"),
    staleTime: 60 * 60 * 1000,
  });
}

/** Filtre "Studio" du module dataviz (modification W, 8ème passe). */
export function useTitleStudios() {
  return useQuery({
    queryKey: ["titles", "studios"],
    queryFn: () => apiFetch<{ id: string; nom: string }[]>("/titles/studios"),
    staleTime: 60 * 60 * 1000,
  });
}
