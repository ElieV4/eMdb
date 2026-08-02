/**
 * Linechart générique, une ligne par série — modification W, 8ème puis
 * 9ème passe (le groupement pilote l'axe X, l'axe "Légende" optionnel
 * trace plusieurs lignes ; remplace l'ancien `FilmSerieLineChart` à 2
 * lignes fixes film/série codées en dur).
 */

"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DatavizPivotedDatum } from "@/lib/dataviz/types";
import { AXIS_COLOR, GRID_COLOR, DIVERGING_PALETTE, CHART_COLORS } from "./ChartColors";
import { ChartTooltip } from "./ChartTooltip";

type DatavizLineChartProps = {
  data: DatavizPivotedDatum[];
  seriesKeys: string[];
  valueFormatter?: (value: number) => string;
};

export function DatavizLineChart({ data, seriesKeys, valueFormatter }: DatavizLineChartProps) {
  const hasLegend = seriesKeys.length > 1 || seriesKeys[0] !== "value";

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
          <XAxis
            dataKey="category"
            stroke={AXIS_COLOR}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
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
            cursor={{ stroke: AXIS_COLOR, strokeDasharray: "3 3" }}
          />
          {hasLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {seriesKeys.map((key, index) => {
            const color = seriesKeys.length === 1 ? CHART_COLORS.primary : DIVERGING_PALETTE[index % DIVERGING_PALETTE.length];
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key === "value" ? "Valeur" : key}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
