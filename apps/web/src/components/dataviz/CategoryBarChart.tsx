/**
 * Graphique en barres horizontales pour les données groupées par catégorie
 * (genre, pays) — Phase 6.
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
  Cell,
} from "recharts";
import { CategoryChartDatum } from "@/lib/dataviz/types";
import { AXIS_COLOR, GRID_COLOR, BAR_PALETTE } from "./ChartColors";
import { ChartTooltip } from "./ChartTooltip";

type CategoryBarChartProps = {
  data: CategoryChartDatum[];
  valueLabel: string;
  valueFormatter?: (value: number) => string;
  /** Hauteur calculée pour éviter le chevauchement (défaut : 300px). */
  height?: number;
};

export function CategoryBarChart({
  data,
  valueLabel,
  valueFormatter,
  height,
}: CategoryBarChartProps) {
  const chartHeight = height ?? Math.max(240, data.length * 36);

  return (
    <div style={{ height: chartHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        >
          <CartesianGrid
            stroke={GRID_COLOR}
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke={AXIS_COLOR}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
          />
          <YAxis
            type="category"
            dataKey="name"
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
          <Bar
            dataKey="value"
            name={valueLabel}
            radius={[0, 4, 4, 0]}
            barSize={20}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={BAR_PALETTE[index % BAR_PALETTE.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
