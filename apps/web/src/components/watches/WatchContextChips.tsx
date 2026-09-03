/**
 * Chips de sélection support/compagnie/émotion — partagés entre HistoryDialog
 * (édition a posteriori) et WatchContextPopup (saisie à la création du watch).
 */

import { cn } from "@/lib/utils";

export const chipClass = (selected: boolean) =>
  cn(
    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
    selected
      ? "bg-primary/20 text-primary"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border",
  );

/** Support/compagnie : un seul choix — cliquer le chip déjà sélectionné le désélectionne. */
export function ChipGroup<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: string | null | undefined;
  onSelect: (next: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(selected ? null : option.value)}
            className={chipClass(selected)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Émotion : plusieurs choix possibles — chaque chip togglé indépendamment. */
export function MultiChipGroup<T extends string>({
  options,
  values,
  onToggle,
}: {
  options: { value: T; label: string }[];
  values: string[] | null | undefined;
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = (values ?? []).includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            aria-pressed={selected}
            className={chipClass(selected)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
