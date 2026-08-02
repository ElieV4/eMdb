/**
 * Hook API pour l'endpoint unique `GET /dataviz/query` — alimente les 8
 * visuels dataviz de la page Profil, modification W (menu unifié, 8ème
 * passe).
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/apiClient";
import { useAuthStore } from "@/store/authStore";
import { DatavizQueryResult, DatavizVisualConfig } from "@/lib/dataviz/types";

function buildParams(config: DatavizVisualConfig): URLSearchParams {
  const params = new URLSearchParams();
  params.set("metric", config.metric);
  params.set("aggregation", config.aggregation);
  params.set("groupBy", config.groupBy);
  if (config.legendBy !== "none") params.set("legendBy", config.legendBy);
  if (config.groupBy === "period" || config.legendBy === "period") params.set("granularity", config.granularity);
  if (config.mediaType) params.set("mediaType", config.mediaType);
  if (config.watchedYearMin !== null) params.set("watchedYearMin", String(config.watchedYearMin));
  if (config.watchedYearMax !== null) params.set("watchedYearMax", String(config.watchedYearMax));
  if (config.releaseYearMin !== null) params.set("releaseYearMin", String(config.releaseYearMin));
  if (config.releaseYearMax !== null) params.set("releaseYearMax", String(config.releaseYearMax));
  if (config.noteImdbMin !== null) params.set("noteImdbMin", String(config.noteImdbMin));
  if (config.noteImdbMax !== null) params.set("noteImdbMax", String(config.noteImdbMax));
  if (config.genreIds.length > 0) params.set("genreIds", config.genreIds.join(","));
  if (config.countryIds.length > 0) params.set("countryIds", config.countryIds.join(","));
  if (config.studioIds.length > 0) params.set("studioIds", config.studioIds.join(","));
  if (config.listIds.length > 0) params.set("listIds", config.listIds.join(","));
  return params;
}

export function useDatavizQuery(config: DatavizVisualConfig) {
  const { isAuthenticated } = useAuthStore();

  return useQuery<DatavizQueryResult>({
    queryKey: ["dataviz", "query", config],
    queryFn: () => apiFetch<DatavizQueryResult>(`/dataviz/query?${buildParams(config).toString()}`),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
