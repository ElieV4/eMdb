/**
 * Bascule "Affiches" / "Tableau" des pages qui listent plusieurs titres :
 * icônes seules, libellé au survol (et en aria-label).
 */

"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewMode } from "@/hooks/useViewMode";
import { cn } from "@/lib/utils";

type ViewModeToggleProps = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** Libellé de la vue "affiches" (ex. « Vue par date » dans l'historique). */
  affichesLabel?: string;
  className?: string;
};

export function ViewModeToggle({ mode, onChange, affichesLabel = "Vue affiches", className }: ViewModeToggleProps) {
  const options: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { value: "affiches", label: affichesLabel, icon: LayoutGrid },
    { value: "tableau", label: "Vue tableau", icon: Table2 },
  ];
  return (
    <div role="group" aria-label="Mode d'affichage" className={cn("inline-flex gap-0.5 rounded-full border p-0.5", className)}>
      {options.map(({ value, label, icon: Icon }) => (
        <Tooltip key={value}>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={label}
                aria-pressed={mode === value}
                onClick={() => onChange(value)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  mode === value ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            }
          />
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
