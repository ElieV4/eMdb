/**
 * Restaure la session au chargement de l'app.
 *
 * Le store Zustand (`useAuthStore`) ne vit qu'en mémoire : un rechargement
 * complet de page (F5, navigation vers une route inexistante qui sort du
 * layout `(frontend)`, etc.) le vide entièrement, même si le cookie
 * `emdb_access_token` posé par le login est toujours valide. Les pages qui
 * lisent `isAuthenticated` (Calendrier, Listes, ...) affichaient alors un
 * message "Connectez-vous" alors que l'utilisateur est bien connecté — perçu
 * comme une déconnexion intempestive.
 *
 * Ce hook relit le cookie au montage et, s'il est présent, récupère
 * l'utilisateur via `GET /auth/me` pour réhydrater le store avant que les
 * pages ne rendent leur état "non connecté".
 */

import { useEffect } from "react";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

const COOKIE_NAME = "emdb_access_token";

function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function clearAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }
}

type MeResult = {
  id: string;
  email: string;
  pseudo: string;
  avatarUrl?: string;
};

export function useAuthBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (isAuthenticated) return;

    const token = getAuthCookie();
    if (!token) return;

    setLoading(true);
    setAccessToken(token);
    apiFetch<MeResult>("/auth/me")
      .then((user) => setUser(user))
      .catch(() => {
        logout();
        clearAuthCookie();
      })
      .finally(() => setLoading(false));
    // Ne s'exécute qu'au montage de l'app : pas de re-fetch à chaque changement d'état.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
