/**
 * Options des dropdowns "Titre"/"Acteur"/"Réalisateur"/"Studio" du module
 * dataviz (groupements "top 20") — `GET /dataviz/filters/{kind}?q=`. Sans
 * `q`, les 20 entités les plus regardées par l'utilisateur ; avec `q`, une
 * recherche parmi ce qu'il a déjà regardé (jamais tout le catalogue local).
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";

export type DatavizFilterOption = { id: string; nom: string };

function useDatavizFilterOptions(kind: "titles" | "actors" | "directors" | "studios", q: string) {
  const { isAuthenticated } = useAuthStore();
  const trimmed = q.trim();

  return useQuery<DatavizFilterOption[]>({
    queryKey: ["dataviz", "filters", kind, trimmed],
    queryFn: () => {
      const params = new URLSearchParams();
      if (trimmed) params.set("q", trimmed);
      return apiFetch<DatavizFilterOption[]>(`/dataviz/filters/${kind}?${params.toString()}`);
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useDatavizTitleOptions(q: string) {
  return useDatavizFilterOptions("titles", q);
}

export function useDatavizActorOptions(q: string) {
  return useDatavizFilterOptions("actors", q);
}

export function useDatavizDirectorOptions(q: string) {
  return useDatavizFilterOptions("directors", q);
}

export function useDatavizStudioOptions(q: string) {
  return useDatavizFilterOptions("studios", q);
}
