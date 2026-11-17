/**
 * Panneau « Colonnes » des vues tableau : colonnes affichées (cases) et
 * ordre (flèches gauche / droite, en plus du glisser-déposer des en-têtes).
 */

"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

type ColumnsPanelProps = {
  /** Colonnes dans l'ordre courant. */
  columns: { id: string; label: string }[];
  isVisible: (id: string) => boolean;
  /** Colonnes toujours affichées (case désactivée). */
  lockedIds?: string[];
  onToggle: (id: string) => void;
  onShift: (id: string, delta: -1 | 1) => void;
  /** Ordre modifié : propose de revenir à l'ordre par défaut. */
  onResetOrder?: () => void;
};

export function ColumnsPanel({
  columns,
  isVisible,
  lockedIds = ["titre"],
  onToggle,
  onShift,
  onResetOrder,
}: ColumnsPanelProps) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3">
      <legend className="px-1 text-xs text-muted-foreground">
        Colonnes affichées (glisser les en-têtes ou utiliser les flèches pour
        les réordonner)
      </legend>
      {columns.map((c, i) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-0.5 rounded-md pr-1 text-sm"
        >
          <button
            type="button"
            onClick={() => onShift(c.id, -1)}
            disabled={i === 0}
            aria-label={`Déplacer ${c.label} vers la gauche`}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={isVisible(c.id)}
              disabled={lockedIds.includes(c.id)}
              onChange={() => onToggle(c.id)}
            />
            {c.label}
          </label>
          <button
            type="button"
            onClick={() => onShift(c.id, 1)}
            disabled={i === columns.length - 1}
            aria-label={`Déplacer ${c.label} vers la droite`}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {onResetOrder && (
        <button
          type="button"
          onClick={onResetOrder}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Ordre par défaut
        </button>
      )}
    </fieldset>
  );
}
