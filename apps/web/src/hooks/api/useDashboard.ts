/**
 * Hooks pour le dashboard de la page d'accueil.
 * Récupère les données pour afficher le contenu personnalisé.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { Title, UserWatch, PaginationResult } from "@/lib/types/api";

// ============================================
// Mapping titre backend (snake_case, brut Prisma) -> Title (camelCase)
// Partagé par usePopularTitles et useRecommendations, qui consomment tous
// deux GET /titles ou une forme équivalente (GET /recommendations/user).
// ============================================

type BackendTitleRow = {
  id: string;
  tmdb_id: number | null;
  type: "film" | "serie";
  titre_vo: string;
  titre_vf: string | null;
  synopsis?: string | null;
  affiche_url: string | null;
  date_sortie: string | null;
  duree_minutes?: number | null;
  note_imdb: number | string | null;
  title_genres?: { genres: { id: string; nom: string } }[];
  title_countries?: { countries: { id: string; nom: string } }[];
};

function mapBackendTitleRow(row: BackendTitleRow): Title {
  return {
    id: row.id,
    tmdbId: row.tmdb_id ?? undefined,
    titre: row.titre_vo,
    titreOriginal: row.titre_vf && row.titre_vf !== row.titre_vo ? row.titre_vf : undefined,
    type: row.type,
    dateSortie: row.date_sortie ?? undefined,
    duree: row.duree_minutes ?? undefined,
    note: row.note_imdb != null ? Number(row.note_imdb) : undefined,
    synopsis: row.synopsis ?? undefined,
    afficheUrl: row.affiche_url ?? undefined,
    genres: row.title_genres?.map((tg) => tg.genres),
    pays: row.title_countries?.map((tc) => tc.countries),
  };
}

// ============================================
// Types pour le dashboard
// ============================================

export type DashboardWatch = UserWatch;

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

export function useRecommendations(limit: number = 6, appreciesFr: boolean = false) {
  return useQuery({
    queryKey: ["dashboard", "recommendations", limit, appreciesFr],
    queryFn: async (): Promise<Title[]> => {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", limit.toString());
      if (appreciesFr) searchParams.set("appreciesFr", "1");

      const rows = await apiFetch<BackendTitleRow[]>(
        `/recommendations/user?${searchParams.toString()}`,
      );
      return rows.map(mapBackendTitleRow);
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
      // ListTitlesFilterDto (backend) attend sort_by/sort_order en
      // snake_case, avec pour seules valeurs valides 'date_sortie'|'note_imdb'
      // ("popularity" n'existe pas en base — pas de colonne TMDB popularity
      // stockée localement) — les anciens params camelCase/valeur invalide
      // étaient silencieusement ignorés par le DTO (retombait sur le
      // défaut date_sortie, jamais un vrai tri par popularité).
      const searchParams = new URLSearchParams();
      searchParams.set("limit", limit.toString());
      searchParams.set("sort_by", "note_imdb");
      searchParams.set("sort_order", "desc");

      const response = await apiFetch<PaginationResult<BackendTitleRow>>(
        `/titles?${searchParams.toString()}`,
      );
      return response.items.map(mapBackendTitleRow);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
