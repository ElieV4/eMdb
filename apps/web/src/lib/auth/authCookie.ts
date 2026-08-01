/**
 * Cookies non-httpOnly d'authentification :
 * - `emdb_access_token` : utilisé par le middleware pour la protection de
 *   routes et par `useAuthBootstrap` pour détecter une session existante au
 *   chargement de l'app (le store Zustand ne vit qu'en mémoire). Aligné sur
 *   la durée de vie du token d'accès (15 min, `auth.module.ts`).
 * - `emdb_refresh_token` : permet à `useAuthBootstrap` de rétablir une
 *   session après un rechargement complet même une fois le token d'accès
 *   expiré (7 jours, cf. `AuthService.signRefreshToken`) — sans lui, le
 *   store Zustand perdait le refresh token à chaque F5, rendant le
 *   rafraîchissement automatique inutile passé la première expiration.
 *
 * Centralisé ici : était dupliqué indépendamment dans useLogin.ts,
 * useRegister.ts et useAuthBootstrap.ts.
 */

export const AUTH_COOKIE_NAME = "emdb_access_token";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 900;

export const REFRESH_COOKIE_NAME = "emdb_refresh_token";
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}`;
  }
}

function clearCookie(name: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=; path=/; max-age=0`;
  }
}

export function getAuthCookie(): string | null {
  return getCookie(AUTH_COOKIE_NAME);
}

export function setAuthCookie(token: string) {
  setCookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_MAX_AGE_SECONDS);
}

export function clearAuthCookie() {
  clearCookie(AUTH_COOKIE_NAME);
}

export function getRefreshCookie(): string | null {
  return getCookie(REFRESH_COOKIE_NAME);
}

export function setRefreshCookie(token: string) {
  setCookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_MAX_AGE_SECONDS);
}

export function clearRefreshCookie() {
  clearCookie(REFRESH_COOKIE_NAME);
}
