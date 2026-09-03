/**
 * Hooks pour la page détail d'un studio — reprend la structure des hooks
 * people (usePerson/usePersonFilmography/usePersonRecommendations).
 * Correspondance backend : GET /studios/:id, /studios/:id/filmography,
 * /studios/:id/people
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export type FollowedStudio = StudioDetail & { followed_at: string };

export function useFollowedStudios() {
  return useQuery({
    queryKey: ["studios", "followed"],
    queryFn: () => apiFetch<FollowedStudio[]>("/studios/followed"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useFollowStudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/studios/${id}/follow`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studios", "followed"] }),
  });
}

export function useUnfollowStudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/studios/${id}/follow`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studios", "followed"] }),
  });
}

export function useRefreshStudioFilmography(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/studios/${id}/filmography/refresh`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studios", "filmography", id] });
      queryClient.invalidateQueries({ queryKey: ["studios", "people", id] });
    },
  });
}
