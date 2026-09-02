/**
 * Hooks API pour la whitelist des sites "gratuits" (paramètres/profil) —
 * table unique partagée par tous les utilisateurs (pas de scoping par user).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { FreeWatchSite, FreeWatchSiteInput, FreeWatchSiteTestResult } from "@/lib/types/api";

export function useFreeWatchSites(enabled = true) {
  return useQuery({
    queryKey: ["free-watch-sites"],
    queryFn: () => apiFetch<FreeWatchSite[]>("/settings/free-watch-sites"),
    enabled,
  });
}

export function useCreateFreeWatchSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FreeWatchSiteInput) =>
      apiFetch<FreeWatchSite>("/settings/free-watch-sites", { method: "POST", body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["free-watch-sites"] }),
  });
}

export function useUpdateFreeWatchSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FreeWatchSiteInput> }) =>
      apiFetch<FreeWatchSite>(`/settings/free-watch-sites/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["free-watch-sites"] }),
  });
}

export function useDeleteFreeWatchSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/settings/free-watch-sites/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["free-watch-sites"] }),
  });
}

export type TestFreeWatchSiteInput = {
  url_recherche: string;
  url_directe?: string | null;
  selecteur_resultat?: string | null;
  titreVo: string;
  type: "film" | "serie";
  anneeSortie?: number;
};

/** Teste une config (enregistrée ou non) sur un titre d'exemple — bouton "tester" du formulaire. */
export function useTestFreeWatchSite() {
  return useMutation({
    mutationFn: (data: TestFreeWatchSiteInput) =>
      apiFetch<FreeWatchSiteTestResult>("/settings/free-watch-sites/test", { method: "POST", body: data }),
  });
}
