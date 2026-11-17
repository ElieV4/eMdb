/**
 * Émotions de l'utilisateur par titre (GET /watches/title-emotions), tous
 * visionnages confondus : affichées en emojis en bas à gauche des affiches
 * (listes, modules horizontaux). Une seule requête, partagée par toutes les
 * cartes de la page.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

export const TITLE_EMOTIONS_KEY = ["title-emotions"] as const;

export function useTitleEmotions() {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Record<string, string[]>>({
    queryKey: TITLE_EMOTIONS_KEY,
    queryFn: () => apiFetch<Record<string, string[]>>("/watches/title-emotions"),
    staleTime: 2 * 60 * 1000,
    enabled: isAuthenticated,
  });
}
