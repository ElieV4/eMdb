/**
 * Hooks pour la gestion des personnes (acteurs, réalisateurs, etc.).
 * Correspondance backend : Phase 3.4 (People)
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import {
  Person,
  PersonDetail,
  PaginationResult,
  PersonSearchResult,
} from "@/lib/types/api";

// ============================================
// Types backend (snake_case) pour la recherche
// ============================================

type BackendPersonSearchResult = {
  tmdb_id: number;
  nom: string;
  photo_url: string | null;
  local: boolean;
  local_id?: string;
};

// ============================================
// Types étendus pour les réponses API
// ============================================

export type PeopleSearchParams = {
  query?: string;
  page?: number;
  limit?: number;
};

export type PeopleSearchResponse = PaginationResult<PersonSearchResult>;

export type PersonFilmography = {
  actor?: TitleWithRole[];
  director?: TitleWithRole[];
  writer?: TitleWithRole[];
  other?: TitleWithRole[];
};

export type TitleWithRole = {
  id: string;
  titre: string;
  type: "film" | "serie";
  dateSortie?: string;
  afficheUrl?: string;
  role?: string; // personnage pour acteur, rôle pour crew
  episodeCount?: number; // pour séries
};

// ============================================
// Transformation backend → frontend
// ============================================

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
// Hook : Recherche de personnes
// ============================================

export function usePeople(params: PeopleSearchParams = {}) {
  const { query, page = 1, limit = 20 } = params;

  return useQuery({
    queryKey: ["people", "search", query, page, limit],
    queryFn: async (): Promise<PeopleSearchResponse> => {
      const searchParams = new URLSearchParams();
      if (query) searchParams.set("q", query);
      searchParams.set("page", page.toString());
      searchParams.set("limit", limit.toString());

      const data = await apiFetch<BackendPersonSearchResult[]>(
        `/people/search?${searchParams.toString()}`,
      );

      const items = data.map(mapBackendPersonToSearchResult);

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
    placeholderData: (previousData) => previousData,
    enabled: !!query, // Ne fetch que si il y a une query
  });
}

// ============================================
// Hook : Détail d'une personne
// ============================================

export function usePerson(id: string) {
  return useQuery({
    queryKey: ["people", "detail", id],
    queryFn: async (): Promise<PersonDetail> => {
      return apiFetch<PersonDetail>(`/people/${id}`);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}

// ============================================
// Hook : Filmographie d'une personne
// ============================================

export function usePersonFilmography(id: string) {
  return useQuery({
    queryKey: ["people", "filmography", id],
    queryFn: async (): Promise<PersonFilmography> => {
      return apiFetch<PersonFilmography>(`/people/${id}/filmography`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}

// ============================================
// Hook : Personnes populaires
// ============================================

export function usePopularPeople(limit: number = 10) {
  return useQuery({
    queryKey: ["people", "popular", limit],
    queryFn: async (): Promise<Person[]> => {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", limit.toString());
      searchParams.set("sortBy", "popularity");
      searchParams.set("sortOrder", "desc");

      const response = await apiFetch<PaginationResult<Person>>(
        `/people?${searchParams.toString()}`,
      );
      return response.items;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
