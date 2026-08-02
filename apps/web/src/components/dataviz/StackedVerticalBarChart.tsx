/**
 * Barchart vertical, une barre par catégorie (empilée en plusieurs
 * segments par catégorie quand l'axe "Légende" est actif) — modification
 * W, 8ème puis 9ème passe (légende générique, remplace l'ancienne
 * scission film/série codée en dur).
 */

"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DatavizPivotedDatum } from "@/lib/dataviz/types";
import { AXIS_COLOR, GRID_COLOR, DIVERGING_PALETTE, CHART_COLORS } from "./ChartColors";
import { ChartTooltip } from "./ChartTooltip";

type StackedVerticalBarChartProps = {
  data: DatavizPivotedDatum[];
  seriesKeys: string[];
  valueFormatter?: (value: number) => string;
};

export function StackedVerticalBarChart({
  data,
  seriesKeys,
  valueFormatter,
}: StackedVerticalBarChartProps) {
  const hasLegend = seriesKeys.length > 1 || seriesKeys[0] !== "value";

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
          <XAxis
            dataKey="category"
            stroke={AXIS_COLOR}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke={AXIS_COLOR}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={valueFormatter} />}
            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          />
          {hasLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {seriesKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              name={key === "value" ? "Valeur" : key}
              stackId="legend"
              fill={seriesKeys.length === 1 ? CHART_COLORS.primary : DIVERGING_PALETTE[index % DIVERGING_PALETTE.length]}
              radius={index === seriesKeys.length - 1 ? [4, 4, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
