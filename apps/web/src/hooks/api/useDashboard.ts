/**
 * Hooks pour le dashboard de la page d'accueil.
 * Récupère les données pour afficher le contenu personnalisé.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { Title, UserWatch, PaginationResult } from "@/lib/types/api";

// ============================================
// Types pour le dashboard
// ============================================

export type DashboardWatch = UserWatch & {
  title: {
    id: string;
    titre: string;
    afficheUrl?: string;
    type: "film" | "serie";
  };
};

export type DashboardFollow = {
  id: string;
  title: Title;
  progress: number; // Pourcentage de visionnage
  episodesNonVus: number;
  nextEpisode?: {
    id: string;
    titre: string;
    numero: number;
    saison: number;
    dateSortie?: string;
  };
};

export type DashboardStats = {
  totalWatches: number;
  totalRatings: number;
  totalLists: number;
  totalFollowedSeries: number;
};

// ============================================
// Hook : Historique récent (derniers visionnages)
// ============================================

export function useRecentWatches(limit: number = 6, enabled: boolean = true) {
  return useQuery({
    queryKey: ["dashboard", "recent-watches", limit],
    queryFn: async (): Promise<DashboardWatch[]> => {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", limit.toString());
      searchParams.set("sortBy", "date");
      searchParams.set("sortOrder", "desc");

      const response = await apiFetch<PaginationResult<UserWatch>>(
        `/watches?${searchParams.toString()}`,
      );

      // Enrichir avec les détails du titre
      // Pour l'instant, on retourne juste les watches
      // À améliorer avec le backend qui devrait déjà inclure le titre
      return response.items as unknown as DashboardWatch[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    enabled,
  });
}

// ============================================
// Hook : Séries suivies (avec progrès)
// ============================================

export function useFollowedSeries(limit: number = 6, enabled: boolean = true) {
  return useQuery({
    queryKey: ["dashboard", "followed-series", limit],
    queryFn: async (): Promise<DashboardFollow[]> => {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", limit.toString());

      const response = await apiFetch<DashboardFollow[]>(
        `/follows?${searchParams.toString()}`,
      );
      return response;
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled,
  });
}

// ============================================
// Hook : Statistiques utilisateur
// ============================================

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      // Pour l'instant, on retourne des valeurs par défaut
      // À implémenter côté backend avec un endpoint dédié
      return {
        totalWatches: 0,
        totalRatings: 0,
        totalLists: 0,
        totalFollowedSeries: 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ============================================
// Hook : Recommandations pour l'utilisateur
// ============================================

export function useRecommendations(limit: number = 6) {
  return useQuery({
    queryKey: ["dashboard", "recommendations", limit],
    queryFn: async (): Promise<Title[]> => {
      // Pour l'instant, on retourne une liste vide
      // À implémenter côté backend avec un endpoint /recommendations/user
      return [];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================
// Hook : Titres populaires (pour les invités)
// ============================================

export function usePopularTitles(limit: number = 12) {
  return useQuery({
    queryKey: ["dashboard", "popular-titles", limit],
    queryFn: async (): Promise<Title[]> => {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", limit.toString());
      searchParams.set("sortBy", "popularity");
      searchParams.set("sortOrder", "desc");

      const response = await apiFetch<PaginationResult<Title>>(
        `/titles?${searchParams.toString()}`,
      );
      return response.items;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
