/**
 * Hooks pour le bouton "Importer les credits" de la page Profil.
 *
 * Déclenche un job BullMQ qui importe les credits (acteurs + réalisateurs)
 * pour tous les titres avec lesquels l'utilisateur a interagi, puis poll
 * le statut jusqu'à complétion.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { API_BASE_URL, apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

export type CreditsImportStartResponse = {
  jobId: string;
  status: string;
};

export type CreditsImportProgress = {
  imported: number;
  total: number;
};

export type CreditsImportResult = {
  creditsImported: number;
  creditsFailed: number;
  titlesProcessed: number;
};

export type CreditsImportStatus = {
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
  progress: CreditsImportProgress | null;
  result: CreditsImportResult | null;
  error: string | null;
};

export function useStartCreditsImport() {
  return useMutation({
    mutationFn: async () => {
      const accessToken = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_BASE_URL}/import/credits`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
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

      return (await res.json()) as CreditsImportStartResponse;
    },
  });
}

const ACTIVE_STATUSES = new Set(["waiting", "active", "delayed", "paused"]);

export function useCreditsImportStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["import", "credits-status", jobId],
    queryFn: () => apiFetch<CreditsImportStatus>(`/import/credits/${jobId}/status`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.has(status) ? 2000 : false;
    },
  });
}
