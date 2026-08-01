/**
 * Résumé de la section Dataviz (Phase 6).
 * Affiche le total (minutes ou visionnages), le nombre de lignes et la période couverte.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { DatavizSummary as DatavizSummaryData } from "@/lib/dataviz/types";

type DatavizSummaryProps = {
  summary: DatavizSummaryData;
  metric: "watch-time" | "watch-count";
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

export function DatavizSummary({ summary, metric }: DatavizSummaryProps) {
  const totalLabel =
    metric === "watch-time"
      ? formatDuration(summary.total)
      : summary.total.toLocaleString("fr-FR");

  const periodLabel =
    summary.minYear !== null && summary.maxYear !== null
      ? summary.minYear === summary.maxYear
        ? String(summary.minYear)
        : `${summary.minYear} – ${summary.maxYear}`
      : "—";

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{totalLabel}</div>
          <p className="text-xs text-muted-foreground">
            {metric === "watch-time" ? "Temps total" : "Visionnages"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{summary.count}</div>
          <p className="text-xs text-muted-foreground">Groupes</p>
        </CardContent>
      </Card>
      <Card className="col-span-2 md:col-span-1">
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{periodLabel}</div>
          <p className="text-xs text-muted-foreground">Période couverte</p>
        </CardContent>
      </Card>
    </div>
  );
}
