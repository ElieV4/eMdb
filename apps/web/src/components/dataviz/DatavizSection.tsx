/**
 * Section Dataviz complète pour la page profil — modification W, 8ème
 * passe (menu unifié). 8 visuels totalement indépendants et
 * reconfigurables (4 cartes génériques + 3 graphiques de répartition + 1
 * linechart), chacun avec son propre "⋮" — seule leur config initiale
 * diffère (`defaultConfig`, approxime les anciennes identités figées
 * Temps/Nombre/Évolution/Stats perso).
 */

"use client";

import { BarChart3 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { DatavizMetricCard } from "./DatavizMetricCard";
import { ConfigurableBreakdownChart } from "./ConfigurableBreakdownChart";
import { ConfigurableLineChart } from "./ConfigurableLineChart";
import { defaultVisualConfig } from "@/lib/dataviz/types";

export function DatavizSection() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
        <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Connectez-vous pour voir vos statistiques de visionnage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DatavizMetricCard defaultConfig={defaultVisualConfig("titles", "distinctCount", "mediaType")} />
        <DatavizMetricCard defaultConfig={defaultVisualConfig("watches", "count", "mediaType")} />
        <DatavizMetricCard defaultConfig={defaultVisualConfig("duration", "evolution", "mediaType")} />
        <DatavizMetricCard defaultConfig={defaultVisualConfig("note", "avg", "none")} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ConfigurableBreakdownChart
          chartType="grouped-bar"
          defaultConfig={{ ...defaultVisualConfig("duration", "sum", "period"), granularity: "monthOfYear" }}
        />
        <ConfigurableBreakdownChart chartType="stacked-bar" defaultConfig={defaultVisualConfig("titles", "count", "genre")} />
        <ConfigurableBreakdownChart
          chartType="grouped-bar"
          defaultConfig={{ ...defaultVisualConfig("titles", "distinctCount", "director"), legendBy: "mediaType" }}
        />
        <ConfigurableBreakdownChart
          chartType="grouped-bar"
          defaultConfig={{ ...defaultVisualConfig("titles", "distinctCount", "actor"), legendBy: "mediaType" }}
        />
        <ConfigurableBreakdownChart
          chartType="donut"
          defaultConfig={{ ...defaultVisualConfig("duration", "sum", "period"), granularity: "weekday" }}
        />
        <ConfigurableLineChart
          defaultConfig={{ ...defaultVisualConfig("duration", "sum", "period"), granularity: "quarter" }}
        />
        <ConfigurableBreakdownChart
          chartType="grouped-bar"
          defaultConfig={{ ...defaultVisualConfig("titles", "distinctCount", "director"), legendBy: "mediaType" }}
        />
        <ConfigurableBreakdownChart
          chartType="grouped-bar"
          defaultConfig={{ ...defaultVisualConfig("titles", "distinctCount", "actor"), legendBy: "mediaType" }}
        />
      </div>
    </div>
  );
}
