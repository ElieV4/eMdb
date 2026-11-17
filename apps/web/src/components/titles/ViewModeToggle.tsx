/**
 * Bascule "Affiches" / "Tableau" des pages qui listent plusieurs titres.
 */

"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { ViewMode } from "@/hooks/useViewMode";
import { cn } from "@/lib/utils";

type ViewModeToggleProps = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
};

const OPTIONS: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: "affiches", label: "Affiches", icon: LayoutGrid },
  { value: "tableau", label: "Tableau", icon: Table2 },
];

export function ViewModeToggle({ mode, onChange, className }: ViewModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Mode d'affichage"
      className={cn("inline-flex gap-1 rounded-lg border p-1", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            mode === value ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
