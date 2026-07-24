/**
 * Client API fetch wrapper pour Next.js.
 *
 * Règles :
 * - Base URL via `NEXT_PUBLIC_API_URL`.
 * - Header `Authorization: Bearer <token>` depuis le store Zustand.
 * - Erreurs 401/403/404 gérées centralement.
 * - Timeout configurable (10s).
 */

import { useAuthStore } from "@/store/authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
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
  const url = `${API_BASE_URL}${path}`;
  const headers = await buildHeaders(options.headers);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
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
