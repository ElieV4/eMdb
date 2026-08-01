/**
 * Filtre de période (Jour/Semaine/Mois/Trimestre/Semestre/Année), format
 * inspiré du widget Outlook Android — partagé entre Historique et Calendrier
 * (modification J).
 */

"use client";

import { PERIOD_OPTIONS, Period } from "@/lib/periodGrouping";
import { cn } from "@/lib/utils";

type PeriodFilterProps = {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
};

export function PeriodFilter({ value, onChange, className }: PeriodFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            value === option.value
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
