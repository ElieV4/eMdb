/**
 * Barchart horizontal, une barre par catégorie (ou plusieurs barres côte à
 * côte par catégorie quand l'axe "Légende" est actif) — modification W,
 * 8ème puis 9ème passe (légende générique, remplace l'ancienne scission
 * film/série codée en dur).
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

type GroupedHorizontalBarChartProps = {
  data: DatavizPivotedDatum[];
  seriesKeys: string[];
  valueFormatter?: (value: number) => string;
  height?: number;
};

export function GroupedHorizontalBarChart({
  data,
  seriesKeys,
  valueFormatter,
  height,
}: GroupedHorizontalBarChartProps) {
  const chartHeight = height ?? Math.max(240, data.length * 44);
  const hasLegend = seriesKeys.length > 1 || seriesKeys[0] !== "value";

  return (
    <div style={{ height: chartHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        >
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            stroke={AXIS_COLOR}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
          />
          <YAxis
            type="category"
            dataKey="category"
            stroke={AXIS_COLOR}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            width={120}
            interval={0}
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
              fill={seriesKeys.length === 1 ? CHART_COLORS.primary : DIVERGING_PALETTE[index % DIVERGING_PALETTE.length]}
              radius={[0, 4, 4, 0]}
              barSize={Math.max(6, 16 - seriesKeys.length)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
