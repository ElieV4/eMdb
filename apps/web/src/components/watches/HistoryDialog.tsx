/**
 * Dialog "Gérer l'historique de visionnage" (modification M) — liste les
 * visionnages d'un titre ou d'un épisode avec suppression par ligne.
 * Remplace les 3 implémentations inline redondantes qui existaient jusqu'ici
 * (TitleActions, page épisode, WatchButton n'en avait aucune).
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { WatchContextUpdateInput } from "@/lib/types/api";
import {
  WATCH_SUPPORT_OPTIONS,
  WATCH_COMPAGNIE_OPTIONS,
  WATCH_EMOTION_OPTIONS,
  supportLabel,
  compagnieLabel,
  emotionLabels,
} from "@/lib/watchContext";

export type HistoryDialogWatch = {
  id: string;
  date_vue: string;
  support?: string | null;
  compagnie?: string | null;
  emotion?: string[] | null;
};

type HistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watches: HistoryDialogWatch[];
  onDelete: (watchId: string) => void;
  /** Absent : le bloc contexte de visionnage n'est pas affiché. */
  onUpdateContext?: (watchId: string, patch: WatchContextUpdateInput) => void;
  emptyLabel?: string;
};

const chipClass = (selected: boolean) =>
  cn(
    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
    selected
      ? "bg-primary/20 text-primary"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border",
  );

/** Support/compagnie : un seul choix — cliquer le chip déjà sélectionné le désélectionne. */
function ChipGroup<T extends string>({
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
function MultiChipGroup<T extends string>({
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

export function HistoryDialog({
  open,
  onOpenChange,
  watches,
  onDelete,
  onUpdateContext,
  emptyLabel = "Aucun visionnage enregistré.",
}: HistoryDialogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = [...watches].sort(
    (a, b) => new Date(b.date_vue).getTime() - new Date(a.date_vue).getTime(),
  );

  const contextSummary = (watch: HistoryDialogWatch) =>
    [supportLabel(watch.support), compagnieLabel(watch.compagnie), emotionLabels(watch.emotion)]
      .filter(Boolean)
      .join(" · ");

  /** Toggle une émotion dans le tableau — tableau vidé => `null` (jamais `[]`, cf. DTO backend `@ArrayMinSize(1)`). */
  const toggleEmotion = (watch: HistoryDialogWatch, value: string) => {
    if (!onUpdateContext) return;
    const current = watch.emotion ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onUpdateContext(watch.id, { emotion: next.length > 0 ? next : null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historique de visionnage</DialogTitle>
          <DialogDescription>
            Visionnages enregistrés — supprimez une entrée pour la retirer de
            l&apos;historique.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          )}
          {sorted.map((watch) => {
            const summary = contextSummary(watch);
            const isExpanded = expandedId === watch.id;
            return (
              <div key={watch.id} className="rounded-md border p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    {/* La date "inconnue" (sentinelle 01-01-1900, cf.
                        resolveWatchDateVue) s'affiche telle quelle plutôt
                        que d'être masquée derrière un libellé — reste
                        visible et reconnaissable dans l'historique. */}
                    <p className="text-sm">
                      {new Date(watch.date_vue).toLocaleString("fr-FR")}
                    </p>
                    {summary && !isExpanded && (
                      <p className="text-xs text-muted-foreground">{summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {onUpdateContext && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(isExpanded ? null : watch.id)}
                        aria-label="Modifier le contexte de visionnage"
                        aria-expanded={isExpanded}
                        className={cn(isExpanded && "bg-muted")}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(watch.id)}
                      aria-label="Supprimer ce visionnage"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {onUpdateContext && isExpanded && (
                  <div className="space-y-2 border-t pt-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Support</span>
                      <ChipGroup
                        options={WATCH_SUPPORT_OPTIONS}
                        value={watch.support}
                        onSelect={(next) => onUpdateContext(watch.id, { support: next })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Compagnie</span>
                      <ChipGroup
                        options={WATCH_COMPAGNIE_OPTIONS}
                        value={watch.compagnie}
                        onSelect={(next) => onUpdateContext(watch.id, { compagnie: next })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Émotion (plusieurs choix possibles)</span>
                      <MultiChipGroup
                        options={WATCH_EMOTION_OPTIONS}
                        values={watch.emotion}
                        onToggle={(value) => toggleEmotion(watch, value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
