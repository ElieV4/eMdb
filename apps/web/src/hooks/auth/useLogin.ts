/**
 * Mutation React Query pour /auth/login.
 * Stocke le token + user + refreshToken dans le store Zustand.
 * Set le cookie `emdb_access_token` pour le middleware.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    pseudo: string;
    avatarUrl?: string;
  };
};

/** Set a non-httpOnly cookie for middleware route protection. */
function setAuthCookie(token: string) {
  if (typeof document !== "undefined") {
    document.cookie = `emdb_access_token=${token}; path=/; max-age=900`; // 15 min
  }
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const data = await apiFetch<LoginResult>("/auth/login", {
        method: "POST",
        body: input,
      });
      return data;
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      setAuthCookie(data.accessToken);
      queryClient.invalidateQueries();
    },
  });
}
