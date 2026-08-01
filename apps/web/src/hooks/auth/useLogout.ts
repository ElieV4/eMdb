/**
 * Mutation pour /auth/logout.
 * Appelle l'API puis clear le store Zustand et les cookies.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import { clearAuthCookie, clearRefreshCookie } from "@/lib/auth/authCookie";

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const clearAll = () => {
    logout();
    clearAuthCookie();
    // Sans ça, le cookie de rafraîchissement (7j) survivait à la
    // déconnexion explicite : useAuthBootstrap rétablissait la session
    // toute seule au rechargement suivant, comme si "Déconnexion" n'avait
    // jamais eu d'effet.
    clearRefreshCookie();
  };

  return useMutation({
    mutationFn: async () => {
      await apiFetch("/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      clearAll();
      queryClient.invalidateQueries();
    },
    // Even if the API fails (e.g. network), clear local state
    onError: clearAll,
  });
}
