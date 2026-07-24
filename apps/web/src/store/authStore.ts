/**
 * Store Zustand pour l'authentification.
 * Stocke l'utilisateur, le token d'accès et le token de rafraîchissement.
 */

import { create } from "zustand";

export type UserState = {
  user: {
    id: string;
    email: string;
    pseudo: string;
    avatarUrl?: string;
  } | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export type AuthActions = {
  setUser: (user: UserState["user"]) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
};

export type AuthStore = UserState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
  setAccessToken: (accessToken) =>
    set({
      accessToken,
    }),
  setRefreshToken: (refreshToken) =>
    set({
      refreshToken,
    }),
  setLoading: (isLoading) =>
    set({
      isLoading,
    }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    }),
}));
