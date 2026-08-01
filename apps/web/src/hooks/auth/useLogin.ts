/**
 * Mutation React Query pour /auth/login.
 * Stocke le token + user + refreshToken dans le store Zustand.
 * Set le cookie `emdb_access_token` pour le middleware.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import { setAuthCookie, setRefreshCookie } from "@/lib/auth/authCookie";

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
      setRefreshCookie(data.refreshToken);
      queryClient.invalidateQueries();
    },
  });
}
