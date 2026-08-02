/**
 * Client API fetch wrapper pour Next.js.
 *
 * Règles :
 * - Base URL via `NEXT_PUBLIC_API_URL`.
 * - Header `Authorization: Bearer <token>` depuis le store Zustand.
 * - Erreurs 401/403/404 gérées centralement.
 * - Timeout configurable (10s).
 * - 401 : tente un rafraîchissement du token (refreshToken, 7j de validité)
 *   et rejoue la requête une fois — sinon, le token d'accès (15 min, cf.
 *   `auth.module.ts`) expirait en silence en cours de session : toutes les
 *   actions utilisateur (vu, favoris, listes...) échouaient avec un 401
 *   jamais géré nulle part, sans aucun retour visible ("le bouton ne
 *   marche plus"), alors que `isAuthenticated` restait `true` dans le
 *   store (rien ne le réinitialisait), donnant l'impression trompeuse que
 *   la session était toujours active.
 */

import { useAuthStore } from "@/store/authStore";
import {
  setAuthCookie,
  clearAuthCookie,
  setRefreshCookie,
  clearRefreshCookie,
} from "@/lib/auth/authCookie";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type RefreshResult = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; pseudo: string; avatarUrl?: string };
};

// Partagé entre tous les appels : si plusieurs requêtes prennent un 401 en
// même temps, elles attendent le même rafraîchissement au lieu d'en
// déclencher un chacune (le refresh token tourne à chaque appel côté
// backend — des refresh concurrents s'invalideraient mutuellement).
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken, setAccessToken, setRefreshToken, setUser, logout } =
      useAuthStore.getState();

    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) throw new Error("refresh failed");

      const data = (await res.json()) as RefreshResult;
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      setAuthCookie(data.accessToken);
      setRefreshCookie(data.refreshToken);
      return data.accessToken;
    } catch {
      // Refresh token lui-même expiré/invalide : la session est
      // réellement terminée, on aligne l'état du store sur la réalité.
      logout();
      clearAuthCookie();
      clearRefreshCookie();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Endpoints qui ne doivent jamais déclencher de tentative de refresh (pour
// éviter toute récursion / boucle sur l'auth elle-même).
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Timeout en ms avant abandon de la requête (défaut : 10s). */
  timeoutMs?: number;
};

async function buildHeaders(
  init?: RequestOptions["headers"],
): Promise<Record<string, string>> {
  const accessToken = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  if (init && Object.keys(init).length > 0) {
    Object.assign(headers, init);
  }

  return headers;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return doFetch<T>(path, options, false);
}

async function doFetch<T>(
  path: string,
  options: RequestOptions,
  isRetry: boolean,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = await buildHeaders(options.headers);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

  try {
    const res = await fetch(url, {
      method: options.method ?? ("GET" as const),
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });

    if (res.status === 204) {
      return undefined as T;
    }

    if (!res.ok) {
      if (
        res.status === 401 &&
        !isRetry &&
        !NO_REFRESH_PATHS.includes(path)
      ) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return doFetch<T>(path, options, true);
        }
      }

      let message = `Erreur API ${res.status}`;
      try {
        const data = await res.json();
        if (typeof data?.message === "string") message = data.message;
      } catch {
        // ignore json parse errors
      }

      if (res.status === 401) {
        throw new Error("Non autorisé");
      }

      if (res.status === 403) throw new Error("Interdit");
      if (res.status === 404) throw new Error("Non trouvé");

      throw new Error(message);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
