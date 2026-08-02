/**
 * Linechart avec sa propre configuration indépendante — modification W,
 * 8ème passe (menu unifié, même mécanisme que `ConfigurableBreakdownChart`
 * ; le groupement choisi pilote l'axe X, plus de sous-titre figé). 9ème
 * passe : axe "Légende" optionnel traçant plusieurs lignes.
 */

"use client";

import { useDatavizConfig } from "@/hooks/dataviz/useDatavizConfig";
import { describeVisualConfig, formatDatavizValue, pivotRowsByLegend } from "@/lib/dataviz/transformers";
import { defaultVisualConfig, DatavizVisualConfig } from "@/lib/dataviz/types";
import { ChartConfigMenu } from "./ChartConfigMenu";
import { DatavizVisualConfigFields } from "./DatavizVisualConfigFields";
import { WidgetHeader } from "./WidgetHeader";
import { DatavizLineChart } from "./DatavizLineChart";
import { DatavizEmptyState } from "./DatavizEmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function ConfigurableLineChart({
  defaultConfig = defaultVisualConfig("duration", "sum", "period"),
}: {
  defaultConfig?: DatavizVisualConfig;
}) {
  const { config, updateConfig, rows, isLoading, isError } = useDatavizConfig(defaultConfig);

  const title = describeVisualConfig(config);
  const { data: pivotedData, seriesKeys } = pivotRowsByLegend(rows, config.groupBy, config.legendBy, config.granularity);
  const valueFormatter = (value: number) => formatDatavizValue(config.metric, config.aggregation, value);

  return (
    <div className="space-y-3">
      <WidgetHeader
        title={title}
        menu={
          <ChartConfigMenu label={title} width="w-80">
            <DatavizVisualConfigFields config={config} updateConfig={updateConfig} showLegend />
          </ChartConfigMenu>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <DatavizEmptyState message="Impossible de charger les statistiques." />
      ) : pivotedData.length === 0 ? (
        <DatavizEmptyState message="Aucune donnée pour ce groupement. Commencez à visionner des titres !" />
      ) : (
        <DatavizLineChart data={pivotedData} seriesKeys={seriesKeys} valueFormatter={valueFormatter} />
      )}
    </div>
  );
}
