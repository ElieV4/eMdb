/**
 * Hooks pour la gestion des titres (films et séries).
 * Correspondance backend : Phase 3.3 (Titles)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import {
  Title,
  PaginationResult,
  TitleSearchResult,
  SearchParams,
} from "@/lib/types/api";

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
      if (query) searchParams.set("query", query);
      if (type) searchParams.set("type", type);
      if (genre) searchParams.set("genre", genre);
      if (country) searchParams.set("country", country);
      if (year) searchParams.set("year", year.toString());
      searchParams.set("page", page.toString());
      searchParams.set("limit", limit.toString());

      return apiFetch<TitlesSearchResponse>(
        `/titles/search?${searchParams.toString()}`,
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
  });
}

// ============================================
// Hook : Détail d'un titre
// ============================================

export function useTitle(id: string) {
  return useQuery({
    queryKey: ["titles", "detail", id],
    queryFn: async (): Promise<Title> => {
      return apiFetch<Title>(`/titles/${id}`);
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
