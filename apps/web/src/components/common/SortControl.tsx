/**
 * Tri d'une vue tableau, dans le panneau « Trier / filtrer » : choix de la
 * colonne puis du sens (croissant / décroissant). Le clic sur les en-têtes
 * reste possible et reste synchronisé.
 */

"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortValue = { column: string; direction: "asc" | "desc" } | null;

type SortControlProps = {
  options: { id: string; label: string }[];
  sort: SortValue;
  onChange: (sort: SortValue) => void;
  className?: string;
};

const fieldClass =
  "h-8 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function SortControl({
  options,
  sort,
  onChange,
  className,
}: SortControlProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-sm", className)}>
      <label htmlFor="table-sort-column" className="text-muted-foreground">
        Trier par
      </label>
      <select
        id="table-sort-column"
        className={fieldClass}
        value={sort?.column ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value
              ? { column: e.target.value, direction: sort?.direction ?? "asc" }
              : null,
          )
        }
      >
        <option value="">Ordre de la page</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {sort && (
        <div
          className="inline-flex overflow-hidden rounded-md border"
          role="group"
          aria-label="Sens du tri"
        >
          {(["asc", "desc"] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-pressed={sort.direction === direction}
              onClick={() => onChange({ column: sort.column, direction })}
              className={cn(
                "inline-flex h-8 items-center gap-1 px-2 text-xs",
                sort.direction === direction
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {direction === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {direction === "asc" ? "Croissant" : "Décroissant"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
