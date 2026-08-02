/**
 * Donut chart des valeurs par catégorie du groupement sélectionné —
 * modification W, 8ème passe (menu unifié : une seule série).
 */

"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { DatavizChartDatum } from "@/lib/dataviz/types";
import { BAR_PALETTE } from "./ChartColors";
import { ChartTooltip } from "./ChartTooltip";

type BreakdownDonutChartProps = {
  data: DatavizChartDatum[];
  valueLabel: string;
  valueFormatter?: (value: number) => string;
};

export function BreakdownDonutChart({
  data,
  valueLabel,
  valueFormatter,
}: BreakdownDonutChartProps) {
  const chartData = data.map((d) => ({ name: d.category, value: d.value }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
            label={({ name, percent }) => `${name} (${Math.round((percent ?? 0) * 100)}%)`}
            labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={BAR_PALETTE[index % BAR_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {total === 0 && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-sm"
            >
              Aucune donnée ({valueLabel.toLowerCase()})
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
