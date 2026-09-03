/**
 * Hooks pour le bouton "Importer depuis Trakt" de la page Profil
 * (bug #55/#56 — script scripts/import-trakt.js exposé en feature UI).
 *
 * Upload en `FormData` (pas `apiFetch`, qui force du JSON) suivi d'un
 * polling du statut de job BullMQ jusqu'à complétion.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { API_BASE_URL, apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

export type TraktImportStartResponse = {
  jobId: string;
  status: string;
};

export type TraktImportProgress = {
  imported: number;
  total: number;
};

export type TraktImportResult = {
  watches: number;
  watchesSkipped: number;
  watchedMovies: number;
  watchedMoviesSkipped: number;
  ratings: number;
  ratingsSkipped: number;
  listsImported: number;
  titlesImported: number;
  titlesFailed: number;
};

export type TraktImportStatus = {
  jobId: string;
  status:
    | "waiting"
    | "active"
    | "completed"
    | "failed"
    | "delayed"
    | "paused"
    | "not_found"
    | string;
  progress: TraktImportProgress | null;
  result: TraktImportResult | null;
  error: string | null;
};

export function useUploadTraktExport() {
  return useMutation({
    mutationFn: async ({ file, sinceDate }: { file: File; sinceDate?: string }) => {
      const accessToken = useAuthStore.getState().accessToken;
      const formData = new FormData();
      formData.append("file", file);
      if (sinceDate) formData.append("sinceDate", sinceDate);

      const res = await fetch(`${API_BASE_URL}/import/trakt`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        let message = `Erreur API ${res.status}`;
        try {
          const data = await res.json();
          if (typeof data?.message === "string") message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      return (await res.json()) as TraktImportStartResponse;
    },
  });
}

const ACTIVE_STATUSES = new Set(["waiting", "active", "delayed", "paused"]);

export function useTraktImportStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["import", "trakt-status", jobId],
    queryFn: () => apiFetch<TraktImportStatus>(`/import/trakt/${jobId}/status`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.has(status) ? 2000 : false;
    },
  });
}
