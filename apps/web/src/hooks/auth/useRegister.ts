/**
 * Mutation React Query pour /auth/register.
 * Stocke le token + user + refreshToken dans le store Zustand.
 * Set le cookie `emdb_access_token` pour le middleware.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import { useCreateList } from "@/hooks/api/useCreateList";
import { setAuthCookie, setRefreshCookie } from "@/lib/auth/authCookie";

export type RegisterInput = {
  email: string;
  pseudo: string;
  password: string;
};

export type RegisterResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    pseudo: string;
    avatarUrl?: string;
  };
};

export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);
  const createList = useCreateList();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const data = await apiFetch<RegisterResult>("/auth/register", {
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

      createList.mutate({
        nom: "Ma Watchlist",
        type: "watchlist",
        description: "Films et séries à voir",
      });
      createList.mutate({
        nom: "Mes Favoris",
        type: "favoris",
        description: "Mes titres préférés",
      });
    },
  });
}
