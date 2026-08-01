/**
 * Section Dataviz complète pour la page profil (Phase 6).
 *
 * Orchestre :
 * - les hooks useWatchTime / useWatchCount (React Query)
 * - les transformers (MV → format Recharts)
 * - les filtres (groupBy, yearFrom/yearTo)
 * - le résumé (total, count, période)
 * - le graphique adapté au groupement :
 *   - period    → line chart
 *   - genre     → bar chart horizontal
 *   - country   → bar chart horizontal
 *   - animation → pie chart
 */

"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useWatchTime } from "@/hooks/dataviz/useWatchTime";
import { useWatchCount } from "@/hooks/dataviz/useWatchCount";
import { useTitleGenres, useTitleCountries } from "@/hooks/api";
import {
  transformWatchTimeByPeriod,
  transformWatchTimeByGenre,
  transformWatchTimeByCountry,
  transformWatchTimeByAnimation,
  transformWatchCountByPeriod,
  transformWatchCountByGenre,
  transformWatchCountByCountry,
  transformWatchCountByAnimation,
  computeDatavizSummary,
} from "@/lib/dataviz/transformers";
import type {
  DatavizGroupBy,
  DatavizMetric,
  PeriodChartDatum,
  CategoryChartDatum,
  AnimationChartDatum,
} from "@/lib/dataviz/types";
import { DatavizFilters } from "./DatavizFilters";
import { DatavizSummary } from "./DatavizSummary";
import { PeriodChart } from "./PeriodChart";
import { CategoryBarChart } from "./CategoryBarChart";
import { AnimationPieChart } from "./AnimationPieChart";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuthStore } from "@/store/authStore";

type MetricTab = {
  value: DatavizMetric;
  label: string;
};

const METRIC_TABS: MetricTab[] = [
  { value: "watch-time", label: "Temps de visionnage" },
  { value: "watch-count", label: "Nombre de visionnages" },
];

export function DatavizSection() {
  const { isAuthenticated } = useAuthStore();

  const [metric, setMetric] = useState<DatavizMetric>("watch-time");
  const [groupBy, setGroupBy] = useState<DatavizGroupBy>("period");
  const [yearFrom, setYearFrom] = useState<number | undefined>(undefined);
  const [yearTo, setYearTo] = useState<number | undefined>(undefined);

  const query = useMemo(
    () => ({ groupBy, yearFrom, yearTo }),
    [groupBy, yearFrom, yearTo],
  );

  const watchTimeQuery = useWatchTime(query);
  const watchCountQuery = useWatchCount(query);
  const genresQuery = useTitleGenres();
  const countriesQuery = useTitleCountries();

  const rawData =
    metric === "watch-time"
      ? (watchTimeQuery.data ?? [])
      : (watchCountQuery.data ?? []);
  const isLoading =
    metric === "watch-time"
      ? watchTimeQuery.isLoading
      : watchCountQuery.isLoading;
  const isError =
    metric === "watch-time" ? watchTimeQuery.isError : watchCountQuery.isError;

  const chartData = useMemo<{
    chart: "line" | "bar" | "pie";
    data: PeriodChartDatum[] | CategoryChartDatum[] | AnimationChartDatum[];
  }>(() => {
    const genres = genresQuery.data ?? [];
    const countries = countriesQuery.data ?? [];

    if (metric === "watch-time") {
      switch (groupBy) {
        case "period":
          return {
            chart: "line" as const,
            data: transformWatchTimeByPeriod(rawData as never),
          };
        case "genre":
          return {
            chart: "bar" as const,
            data: transformWatchTimeByGenre(rawData as never, genres),
          };
        case "country":
          return {
            chart: "bar" as const,
            data: transformWatchTimeByCountry(rawData as never, countries),
          };
        case "animation":
          return {
            chart: "pie" as const,
            data: transformWatchTimeByAnimation(rawData as never),
          };
      }
    }

    switch (groupBy) {
      case "period":
        return {
          chart: "line" as const,
          data: transformWatchCountByPeriod(rawData as never),
        };
      case "genre":
        return {
          chart: "bar" as const,
          data: transformWatchCountByGenre(rawData as never, genres),
        };
      case "country":
        return {
          chart: "bar" as const,
          data: transformWatchCountByCountry(rawData as never, countries),
        };
      case "animation":
        return {
          chart: "pie" as const,
          data: transformWatchCountByAnimation(rawData as never),
        };
    }
  }, [metric, groupBy, rawData, genresQuery.data, countriesQuery.data]);

  const summary = useMemo(
    () =>
      computeDatavizSummary(
        rawData as never,
        metric === "watch-time" ? "minutes" : "nb_items",
      ),
    [rawData, metric],
  );

  const valueLabel = metric === "watch-time" ? "Minutes" : "Visionnages";
  const valueFormatter =
    metric === "watch-time"
      ? (value: number) =>
          `${value.toLocaleString("fr-FR")} min (${Math.floor(value / 60)} h)`
      : (value: number) =>
          `${value.toLocaleString("fr-FR")} vue${value > 1 ? "s" : ""}`;

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
        <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Connectez-vous pour voir vos statistiques de visionnage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onglets métrique */}
      <div className="flex flex-wrap gap-1 rounded-lg border p-1 w-fit">
        {METRIC_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setMetric(tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              metric === tab.value
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <DatavizFilters
        groupBy={groupBy}
        yearFrom={yearFrom}
        yearTo={yearTo}
        onGroupByChange={setGroupBy}
        onYearFromChange={setYearFrom}
        onYearToChange={setYearTo}
      />

      {/* Résumé */}
      <DatavizSummary summary={summary} metric={metric} />

      {/* Graphique */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
          <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>
            Impossible de charger les statistiques. Les vues matérialisées sont
            peut-être vides (pas encore de visionnages) ou indisponibles.
          </p>
        </div>
      ) : chartData.data.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
          <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>
            Aucune donnée pour ce groupement. Commencez à visionner des titres !
          </p>
        </div>
      ) : chartData.chart === "line" ? (
        <PeriodChart
          data={chartData.data as PeriodChartDatum[]}
          valueLabel={valueLabel}
          valueFormatter={valueFormatter}
        />
      ) : chartData.chart === "bar" ? (
        <CategoryBarChart
          data={chartData.data as CategoryChartDatum[]}
          valueLabel={valueLabel}
          valueFormatter={valueFormatter}
        />
      ) : (
        <AnimationPieChart
          data={chartData.data as AnimationChartDatum[]}
          valueLabel={valueLabel}
          valueFormatter={valueFormatter}
        />
      )}
    </div>
  );
}
