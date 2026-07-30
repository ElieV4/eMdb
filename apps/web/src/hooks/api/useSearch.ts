/**
 * Hook unifié pour la recherche (titres + personnes).
 * Correspondance backend : Phase 3.3 (Titles), 3.4 (People)
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import {
  TitleSearchResult,
  PersonSearchResult,
  PaginationResult,
  SearchType,
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

type BackendPersonSearchResult = {
  tmdb_id: number;
  nom: string;
  photo_url: string | null;
  local: boolean;
  local_id?: string;
};

// ============================================
// Types pour la recherche unifiée
// ============================================

export type UnifiedSearchParams = {
  query: string;
  type?: SearchType;
  page?: number;
  limit?: number;
  // Filtres spécifiques aux titres
  genre?: string;
  country?: string;
  year?: number;
};

export type UnifiedSearchResult = {
  titles?: PaginationResult<TitleSearchResult>;
  people?: PaginationResult<PersonSearchResult>;
  query: string;
  type?: SearchType;
};

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

function mapBackendPersonToSearchResult(
  item: BackendPersonSearchResult,
): PersonSearchResult {
  const id = item.local_id ?? String(item.tmdb_id);
  return {
    id,
    tmdbId: item.tmdb_id,
    nom: item.nom,
    photoUrl: item.photo_url ?? undefined,
    local: item.local,
  };
}

// ============================================
// Hook : Recherche unifiée
// ============================================

export function useSearch(params: UnifiedSearchParams) {
  const { query, type, page = 1, limit = 20, genre, country, year } = params;

  // Pour les titres uniquement
  const titlesQuery = useQuery({
    queryKey: [
      "search",
      "titles",
      query,
      type,
      genre,
      country,
      year,
      page,
      limit,
    ],
    queryFn: async (): Promise<PaginationResult<TitleSearchResult>> => {
      const searchParams = new URLSearchParams();
      searchParams.set("q", query);
      if (type && type !== "personne") searchParams.set("type", type);
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!query && (!type || type !== "personne"),
  });

  // Pour les personnes uniquement
  const peopleQuery = useQuery({
    queryKey: ["search", "people", query, page, limit],
    queryFn: async (): Promise<PaginationResult<PersonSearchResult>> => {
      const searchParams = new URLSearchParams();
      searchParams.set("q", query);
      searchParams.set("page", page.toString());
      searchParams.set("limit", limit.toString());

      const data = await apiFetch<BackendPersonSearchResult[]>(
        `/people/search?${searchParams.toString()}`,
      );

      const items = data
        .filter((item) => item.local)
        .map(mapBackendPersonToSearchResult);

      return {
        items,
        total: items.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(items.length / limit)),
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!query && (!type || type === "personne"),
  });

  // État de chargement global
  const isLoading = titlesQuery.isLoading || peopleQuery.isLoading;
  const isError = titlesQuery.isError || peopleQuery.isError;
  const error = titlesQuery.error || peopleQuery.error;

  // Formatage du résultat unifié
  const data: UnifiedSearchResult = {
    query,
    type,
    titles: titlesQuery.data,
    people: peopleQuery.data,
  };

  return {
    data,
    isLoading,
    isError,
    error,
    isFetching: titlesQuery.isFetching || peopleQuery.isFetching,
  };
}

// ============================================
// Hook : Recherche avec debounce intégré
// ============================================

export function useDebouncedSearch(
  searchParams: Omit<UnifiedSearchParams, "query">,
  debounceMs: number = 500,
) {
  const [internalQuery, setInternalQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(internalQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalQuery, debounceMs]);

  const result = useSearch({
    ...searchParams,
    query: debouncedQuery,
  });

  return {
    ...result,
    query: internalQuery,
    setQuery: setInternalQuery,
    debouncedQuery,
  };
}
