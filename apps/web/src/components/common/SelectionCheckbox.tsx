/**
 * Case à cocher superposée sur une carte, utilisée par le mode sélection
 * multiple ("Modifier le contenu" — Continuer à regarder / Watchlist /
 * Historique). Rendue en sibling du `Link` de la carte, pas en enfant (un
 * `<button>` imbriqué dans un `<a>` casse silencieusement le clic, cf. bug
 * #45) — même convention que `TitleQuickActionsMenu`/`TitleWatchedButton`.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectionCheckboxProps = {
  selected: boolean;
  onToggle: () => void;
  className?: string;
};

export function SelectionCheckbox({ selected, onToggle, className }: SelectionCheckboxProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={selected ? "Désélectionner" : "Sélectionner"}
      aria-pressed={selected}
      className={cn(
        "absolute top-1.5 left-1.5 z-40 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/80 bg-black/50 hover:bg-black/70",
        className,
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}
