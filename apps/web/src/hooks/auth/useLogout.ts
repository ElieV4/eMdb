/**
 * Mutation pour /auth/logout.
 * Appelle l'API puis clear le store Zustand et le cookie.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

/** Clear the auth cookie used by the middleware. */
function clearAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "emdb_access_token=; path=/; max-age=0";
  }
}

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      await apiFetch("/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      logout();
      clearAuthCookie();
      queryClient.invalidateQueries();
    },
    // Even if the API fails (e.g. network), clear local state
    onError: () => {
      logout();
      clearAuthCookie();
    },
  });
}
