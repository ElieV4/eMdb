/**
 * Graphique en camembert pour les données groupées par animation
 * (animation vs live-action) — Phase 6.
 */

"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { AnimationChartDatum } from "@/lib/dataviz/types";
import { ANIMATION_PALETTE } from "./ChartColors";
import { ChartTooltip } from "./ChartTooltip";

type AnimationPieChartProps = {
  data: AnimationChartDatum[];
  valueLabel: string;
  valueFormatter?: (value: number) => string;
};

export function AnimationPieChart({
  data,
  valueLabel,
  valueFormatter,
}: AnimationPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={0}
            label={({ name, percent }) =>
              `${name} (${Math.round((percent ?? 0) * 100)}%)`
            }
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={ANIMATION_PALETTE[index % ANIMATION_PALETTE.length]}
              />
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
