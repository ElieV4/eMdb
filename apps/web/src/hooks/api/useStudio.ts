/**
 * Hooks pour la page détail d'un studio — reprend la structure des hooks
 * people (usePerson/usePersonFilmography/usePersonRecommendations).
 * Correspondance backend : GET /studios/:id, /studios/:id/filmography,
 * /studios/:id/people
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { FilmographyGrouped, PersonRecommendation } from "@/lib/types/api";

export type StudioDetail = {
  id: string;
  tmdb_id: number | null;
  nom: string;
  logo_url: string | null;
};

export function useStudio(id: string) {
  return useQuery({
    queryKey: ["studios", "detail", id],
    queryFn: async (): Promise<StudioDetail> => {
      return apiFetch<StudioDetail>(`/studios/${id}`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}

export function useStudioFilmography(id: string) {
  return useQuery({
    queryKey: ["studios", "filmography", id],
    queryFn: async (): Promise<FilmographyGrouped> => {
      return apiFetch<FilmographyGrouped>(`/studios/${id}/filmography`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}

export function useStudioRelatedPeople(id: string) {
  return useQuery({
    queryKey: ["studios", "people", id],
    queryFn: async (): Promise<PersonRecommendation[]> => {
      return apiFetch<PersonRecommendation[]>(`/studios/${id}/people`);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}
