/**
 * Graphique en ligne pour les données groupées par période (Phase 6).
 * Utilisé pour watch-time et watch-count (groupBy=period).
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
} from "recharts";
import { PeriodChartDatum } from "@/lib/dataviz/types";
import { AXIS_COLOR, GRID_COLOR, CHART_COLORS } from "./ChartColors";
import { ChartTooltip } from "./ChartTooltip";

type PeriodChartProps = {
  data: PeriodChartDatum[];
  valueLabel: string;
  valueFormatter?: (value: number) => string;
};

export function PeriodChart({
  data,
  valueLabel,
  valueFormatter,
}: PeriodChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke={AXIS_COLOR}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            minTickGap={24}
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
          <Line
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: CHART_COLORS.primaryHover,
              strokeWidth: 0,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
