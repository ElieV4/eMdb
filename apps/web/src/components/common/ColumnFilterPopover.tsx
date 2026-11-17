/**
 * Icône entonnoir d'un en-tête de colonne : ouvre le filtre adapté à la
 * colonne — barre de recherche (texte), curseur à deux bornes (dates,
 * durée, notes) ou liste de cases (genres, pays, type...). L'icône est
 * colorée quand un filtre est actif.
 *
 * Utilisée aussi, avec un libellé visible, dans le panneau « Trier /
 * filtrer » de la vue affiches.
 */

"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Filter, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  FilterKind,
  FilterOption,
  FilterValue,
  isActiveFilter,
} from "@/lib/columnFilters";
import { cn } from "@/lib/utils";

type ColumnFilterPopoverProps = {
  /** Nom de la colonne (libellés accessibles). */
  label: string;
  kind: FilterKind;
  value: FilterValue | null | undefined;
  onChange: (value: FilterValue | null) => void;
  /** Plage : bornes des valeurs présentes, pas et format d'affichage. */
  bounds?: [number, number] | null;
  step?: number;
  format?: (n: number) => string;
  /** Liste : valeurs proposées. */
  options?: FilterOption[];
  /** Affiche le libellé à côté de l'icône (panneau de la vue affiches). */
  showLabel?: boolean;
  className?: string;
};

export function ColumnFilterPopover({
  label,
  kind,
  value,
  onChange,
  bounds,
  step = 1,
  format = (n) => String(n),
  options = [],
  showLabel = false,
  className,
}: ColumnFilterPopoverProps) {
  const active = isActiveFilter(value, bounds);

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        render={
          <button
            type="button"
            aria-label={`Filtrer ${label}${active ? " (filtre actif)" : ""}`}
            className={cn(
              "inline-flex items-center gap-1 rounded transition-colors",
              showLabel
                ? cn(
                    "h-8 rounded-full border px-3 text-xs",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )
                : cn(
                    "p-0.5",
                    active
                      ? "text-primary"
                      : "text-muted-foreground/60 hover:text-foreground",
                  ),
              className,
            )}
          >
            <Filter className={cn("h-3 w-3", active && "fill-current")} />
            {showLabel && label}
          </button>
        }
      />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          className="isolate z-50 outline-none"
          sideOffset={4}
          align="start"
        >
          <PopoverPrimitive.Popup className="z-50 w-64 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Filtrer : {label}
              </span>
              {active && (
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Effacer
                </button>
              )}
            </div>

            {kind === "text" && (
              <input
                type="search"
                autoFocus
                value={value?.kind === "text" ? value.value : ""}
                onChange={(e) =>
                  onChange(
                    e.target.value
                      ? { kind: "text", value: e.target.value }
                      : null,
                  )
                }
                placeholder="Contient…"
                aria-label={`Rechercher dans ${label}`}
                className="h-8 w-full rounded-md border bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            )}

            {kind === "range" &&
              (bounds && bounds[0] < bounds[1] ? (
                <RangeFilter
                  label={label}
                  bounds={bounds}
                  step={step}
                  format={format}
                  value={
                    value?.kind === "range" ? [value.min, value.max] : bounds
                  }
                  onChange={([min, max]) =>
                    onChange(
                      min <= bounds[0] && max >= bounds[1]
                        ? null
                        : { kind: "range", min, max },
                    )
                  }
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {bounds
                    ? `Une seule valeur : ${format(bounds[0])}`
                    : "Aucune valeur à filtrer."}
                </p>
              ))}

            {kind === "set" &&
              (options.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune valeur à filtrer.
                </p>
              ) : (
                <ul
                  className="max-h-64 space-y-0.5 overflow-y-auto"
                  aria-label={`Valeurs de ${label}`}
                >
                  {options.map((o) => {
                    const selected = value?.kind === "set" ? value.values : [];
                    const checked = selected.includes(o.value);
                    return (
                      <li key={o.value}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? selected.filter((v) => v !== o.value)
                                : [...selected, o.value];
                              onChange(
                                next.length
                                  ? { kind: "set", values: next }
                                  : null,
                              );
                            }}
                          />
                          <span className="flex-1 truncate">{o.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {o.count}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ))}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function RangeFilter({
  label,
  bounds,
  step,
  format,
  value,
  onChange,
}: {
  label: string;
  bounds: [number, number];
  step: number;
  format: (n: number) => string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}) {
  return (
    <div className="space-y-2">
      <Slider
        min={bounds[0]}
        max={bounds[1]}
        step={step}
        value={value}
        onValueChange={(v) => Array.isArray(v) && onChange([v[0], v[1]])}
        aria-label={`Plage de ${label}`}
      />
      <div
        className="flex justify-between text-xs text-muted-foreground"
        aria-live="polite"
      >
        <span>{format(value[0])}</span>
        <span>{format(value[1])}</span>
      </div>
    </div>
  );
}
