/**
 * Panneau « Trier / filtrer » de la vue affiches : choix du tri (colonne et
 * sens) et filtres (genres, pays, sortie, durée, notes, type, émotions),
 * chacun dans un bouton-entonnoir qui s'ouvre en curseur ou en liste.
 */

"use client";

import { X } from "lucide-react";
import { ColumnFilterPopover } from "@/components/common/ColumnFilterPopover";
import { SortControl } from "@/components/common/SortControl";
import {
  PANEL_FILTER_DEFS,
  PANEL_SORT_OPTIONS,
  TitleSortFilterState,
} from "@/hooks/useTitleSortFilter";
import { filterChoices } from "@/lib/titlesTable";
import { cn } from "@/lib/utils";

export function TitlesSortFilterPanel({
  state,
  className,
}: {
  state: TitleSortFilterState;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 rounded-lg border p-3", className)}>
      <SortControl
        options={PANEL_SORT_OPTIONS}
        sort={state.sort}
        onChange={state.setSort}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrer</span>
        {PANEL_FILTER_DEFS.map((def) => (
          <ColumnFilterPopover
            key={def.id}
            label={def.label}
            kind={def.kind}
            value={state.filters[def.id]}
            onChange={(v) => state.setFilter(def.id, v)}
            step={def.step}
            format={def.format}
            showLabel
            {...filterChoices(def, state.rows)}
          />
        ))}
        {state.activeCount > 0 && (
          <button
            type="button"
            onClick={state.reset}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Tout effacer
          </button>
        )}
      </div>
    </div>
  );
}
