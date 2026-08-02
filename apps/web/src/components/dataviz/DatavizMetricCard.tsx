/**
 * Carte générique, entièrement configurable via son menu "⋮" — modification
 * W, 8ème passe. Remplace les 4 cartes à identité figée (Temps/Nombre/
 * Évolution/Stats perso) : chaque instance ne diffère plus que par sa
 * config initiale (`defaultConfig`), librement modifiable ensuite comme
 * n'importe quel visuel.
 *
 * Quand le groupement choisi n'est pas "Tout", affiche le total (agrégat
 * sur l'ensemble des données) ET le détail par catégorie du groupement, en
 * dessous — demande utilisateur.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useDatavizConfig } from "@/hooks/dataviz/useDatavizConfig";
import { describeVisualConfig, formatDatavizValue, labelRows } from "@/lib/dataviz/transformers";
import { DatavizVisualConfig } from "@/lib/dataviz/types";
import { ChartConfigMenu } from "./ChartConfigMenu";
import { DatavizVisualConfigFields } from "./DatavizVisualConfigFields";
import { WidgetHeader } from "./WidgetHeader";
import { DatavizEmptyState } from "./DatavizEmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function DatavizMetricCard({ defaultConfig }: { defaultConfig: DatavizVisualConfig }) {
  const { config, updateConfig, total, rows, isLoading, isError } = useDatavizConfig(defaultConfig);

  const title = describeVisualConfig(config);
  const primaryValue = config.groupBy === "none" ? (rows[0]?.value ?? null) : total;
  const breakdown = config.groupBy === "none" ? [] : labelRows(rows, config.groupBy, config.granularity);

  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        <WidgetHeader
          title={title}
          menu={
            <ChartConfigMenu label={title} width="w-80">
              <DatavizVisualConfigFields config={config} updateConfig={updateConfig} />
            </ChartConfigMenu>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <DatavizEmptyState message="Impossible de charger les statistiques." />
        ) : (
          <div className="space-y-1 text-center text-sm">
            <p className="text-lg font-bold">
              {formatDatavizValue(config.metric, config.aggregation, primaryValue)}
            </p>
            {breakdown.length > 0 && (
              <div className="space-y-0.5 pt-1">
                {breakdown.map((row) => (
                  <p key={row.category} className="text-muted-foreground">
                    <span>{row.category} :</span>{" "}
                    <span className="font-medium">
                      {formatDatavizValue(config.metric, config.aggregation, row.value)}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
