/**
 * Tooltip personnalisé partagé pour les graphiques Recharts (Phase 6).
 * Adapté au thème sombre eMDB.
 */

import { TOOLTIP_BG, TOOLTIP_BORDER } from "./ChartColors";

type TooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  valueFormatter?: (value: number) => string;
};

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: TOOLTIP_BG,
        borderColor: TOOLTIP_BORDER,
      }}
    >
      {label !== undefined && (
        <p className="mb-1 font-medium text-white">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const value =
            typeof entry.value === "number"
              ? valueFormatter
                ? valueFormatter(entry.value)
                : entry.value.toLocaleString("fr-FR")
              : String(entry.value ?? "");
          return (
            <div key={index} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto font-semibold text-white">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
