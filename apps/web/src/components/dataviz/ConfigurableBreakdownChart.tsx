/**
 * Graphique de répartition (barres horizontales / barres verticales /
 * donut) avec sa propre configuration indépendante, réglable via un
 * bouton "⋮" — modification W, 8ème passe (menu unifié métrique/
 * agrégation/groupement/filtres, titre dérivé de la config, plus de
 * sous-titre figé indiquant le type de chart). 9ème passe : axe "Légende"
 * optionnel (barres uniquement, pas le donut) divisant chaque barre en
 * plusieurs séries.
 */

"use client";

import { useDatavizConfig } from "@/hooks/dataviz/useDatavizConfig";
import { describeVisualConfig, formatDatavizValue, pivotRowsByLegend, transformRows, unitForMetric } from "@/lib/dataviz/transformers";
import { defaultVisualConfig, DatavizVisualConfig } from "@/lib/dataviz/types";
import { ChartConfigMenu } from "./ChartConfigMenu";
import { DatavizVisualConfigFields } from "./DatavizVisualConfigFields";
import { WidgetHeader } from "./WidgetHeader";
import { GroupedHorizontalBarChart } from "./GroupedHorizontalBarChart";
import { StackedVerticalBarChart } from "./StackedVerticalBarChart";
import { BreakdownDonutChart } from "./BreakdownDonutChart";
import { DatavizEmptyState } from "./DatavizEmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export type BreakdownChartType = "grouped-bar" | "stacked-bar" | "donut";

export function ConfigurableBreakdownChart({
  chartType,
  defaultConfig = defaultVisualConfig("duration", "sum", "period"),
}: {
  chartType: BreakdownChartType;
  defaultConfig?: DatavizVisualConfig;
}) {
  const { config, updateConfig, rows, isLoading, isError } = useDatavizConfig(defaultConfig);

  const title = describeVisualConfig(config);
  const valueLabel = unitForMetric(config.metric, config.aggregation) || "Valeur";
  const valueFormatter = (value: number) => formatDatavizValue(config.metric, config.aggregation, value);
  const isBarChart = chartType === "grouped-bar" || chartType === "stacked-bar";
  const { data: pivotedData, seriesKeys } = pivotRowsByLegend(rows, config.groupBy, config.legendBy, config.granularity);
  const donutData = transformRows(rows, config.groupBy, config.granularity);
  const isEmpty = isBarChart ? pivotedData.length === 0 : donutData.length === 0;

  return (
    <div className="space-y-3">
      <WidgetHeader
        title={title}
        menu={
          <ChartConfigMenu label={title} width="w-80">
            <DatavizVisualConfigFields config={config} updateConfig={updateConfig} showLegend={isBarChart} />
          </ChartConfigMenu>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <DatavizEmptyState message="Impossible de charger les statistiques." />
      ) : isEmpty ? (
        <DatavizEmptyState message="Aucune donnée pour ce groupement. Commencez à visionner des titres !" />
      ) : chartType === "grouped-bar" ? (
        <GroupedHorizontalBarChart data={pivotedData} seriesKeys={seriesKeys} valueFormatter={valueFormatter} />
      ) : chartType === "stacked-bar" ? (
        <StackedVerticalBarChart data={pivotedData} seriesKeys={seriesKeys} valueFormatter={valueFormatter} />
      ) : (
        <BreakdownDonutChart data={donutData} valueLabel={valueLabel} valueFormatter={valueFormatter} />
      )}
    </div>
  );
}
