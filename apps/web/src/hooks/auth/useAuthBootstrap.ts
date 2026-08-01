/**
 * Restaure la session au chargement de l'app.
 *
 * Le store Zustand (`useAuthStore`) ne vit qu'en mémoire : un rechargement
 * complet de page (F5, navigation vers une route inexistante qui sort du
 * layout `(frontend)`, etc.) le vide entièrement, même si les cookies posés
 * par le login sont toujours valides. Les pages qui lisent `isAuthenticated`
 * (Calendrier, Listes, ...) affichaient alors un message "Connectez-vous"
 * alors que l'utilisateur est bien connecté — perçu comme une déconnexion
 * intempestive (bug #41).
 *
 * Deux cas, dans l'ordre :
 * 1. Cookie d'accès encore valide (< 15 min) : réhydrate directement via
 *    `GET /auth/me`.
 * 2. Cookie d'accès expiré mais cookie de rafraîchissement encore valide
 *    (< 7 jours) : rétablit la session via `POST /auth/refresh` — sans ce
 *    deuxième cas, le refresh token n'était de toute façon jamais restauré
 *    en mémoire après un F5, rendant le rafraîchissement automatique
 *    d'`apiClient.ts` inopérant dès la première expiration suivant un
 *    rechargement de page.
 * Dans les deux cas, le refresh token est réhydraté dans le store pour que
 * les futurs 401 (expiration en cours de session) puissent être
 * silencieusement rafraîchis par `apiFetch`.
 */

import { useEffect } from "react";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import {
  getAuthCookie,
  clearAuthCookie,
  getRefreshCookie,
  setAuthCookie,
  setRefreshCookie,
  clearRefreshCookie,
} from "@/lib/auth/authCookie";

type MeResult = {
  id: string;
  email: string;
  pseudo: string;
  avatarUrl?: string;
};

type RefreshResult = {
  accessToken: string;
  refreshToken: string;
  user: MeResult;
};

export function useAuthBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (isAuthenticated) return;

    const accessCookie = getAuthCookie();
    const refreshCookie = getRefreshCookie();

    const clearEverything = () => {
      logout();
      clearAuthCookie();
      clearRefreshCookie();
    };

    if (accessCookie) {
      setLoading(true);
      setAccessToken(accessCookie);
      if (refreshCookie) setRefreshToken(refreshCookie);
      apiFetch<MeResult>("/auth/me")
        .then((user) => setUser(user))
        .catch(clearEverything)
        .finally(() => setLoading(false));
      return;
    }

    if (refreshCookie) {
      setLoading(true);
      apiFetch<RefreshResult>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: refreshCookie },
      })
        .then((data) => {
          setAccessToken(data.accessToken);
          setRefreshToken(data.refreshToken);
          setUser(data.user);
          setAuthCookie(data.accessToken);
          setRefreshCookie(data.refreshToken);
        })
        .catch(clearEverything)
        .finally(() => setLoading(false));
    }
    // Ne s'exécute qu'au montage de l'app : pas de re-fetch à chaque changement d'état.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
