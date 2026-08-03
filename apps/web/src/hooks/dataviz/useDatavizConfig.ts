/**
 * État + données d'un visuel dataviz — partagé par les 8 widgets
 * (modification W, menu unifié, 8ème passe). Gère la cohérence de la
 * config (agrégation invalide pour la métrique choisie, groupement
 * incompatible avec l'agrégation choisie) en plus du fetch.
 */

"use client";

import { useState } from "react";
import { useDatavizQuery } from "./useDatavizQuery";
import {
  ALLOWED_AGGREGATIONS,
  DatavizVisualConfig,
  isGroupByRestricted,
  isTop20GroupByAllowed,
  supportsLegend,
  TOP20_GROUP_BYS,
} from "@/lib/dataviz/types";

export function useDatavizConfig(initial: DatavizVisualConfig) {
  const [config, setConfig] = useState<DatavizVisualConfig>(initial);
  const query = useDatavizQuery(config);

  function updateConfig(patch: Partial<DatavizVisualConfig>) {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      // Métrique changée : l'agrégation choisie peut ne plus être valide.
      if (patch.metric && !ALLOWED_AGGREGATIONS[next.metric].includes(next.aggregation)) {
        next.aggregation = ALLOWED_AGGREGATIONS[next.metric][0];
      }
      // watches/titles + min/max/avg/évolution restreint le groupement à tout/période.
      if (isGroupByRestricted(next.metric, next.aggregation) && next.groupBy !== "none" && next.groupBy !== "period") {
        next.groupBy = "none";
      }
      // Groupement top 20 (titre/acteur/réalisateur) devenu incompatible
      // avec la nouvelle métrique/agrégation (ex. passage à "note").
      if (TOP20_GROUP_BYS.includes(next.groupBy) && !isTop20GroupByAllowed(next.metric, next.aggregation)) {
        next.groupBy = "none";
      }
      // Agrégation devenue incompatible avec l'axe "Légende" (evolution/note+avg/restreint).
      if (!supportsLegend(next.metric, next.aggregation)) {
        next.legendBy = "none";
      }
      // La légende ne peut pas porter sur le même groupement que l'axe principal.
      if (next.legendBy === next.groupBy && next.legendBy !== "none") {
        next.legendBy = "none";
      }
      // Pour les groupements "top 20" (titre/acteur/réalisateur), la légende
      // n'est supportée que par `mediaType` (film/série) côté backend.
      if (TOP20_GROUP_BYS.includes(next.groupBy) && next.legendBy !== "none" && next.legendBy !== "mediaType") {
        next.legendBy = "none";
      }
      return next;
    });
  }

  return {
    config,
    updateConfig,
    total: query.data?.total ?? null,
    rows: query.data?.rows ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
