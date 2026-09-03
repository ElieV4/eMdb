/**
 * Popup "contexte de visionnage" proposé juste après avoir marqué un
 * titre/épisode comme vu (support/compagnie/émotion) — déclenché par
 * WatchButton selon le réglage `watchContextPopup` (Paramètres). Chaque
 * chip sauvegarde immédiatement (même pattern que HistoryDialog), pas de
 * bouton "Enregistrer" séparé : juste "Terminé" pour fermer.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChipGroup, MultiChipGroup } from "./WatchContextChips";
import { useUpdateWatchContext } from "@/hooks/api/useUpdateWatchContext";
import {
  WATCH_SUPPORT_OPTIONS,
  WATCH_COMPAGNIE_OPTIONS,
  WATCH_EMOTION_OPTIONS,
  WatchSupport,
  WatchCompagnie,
  WatchEmotion,
} from "@/lib/watchContext";

type WatchContextPopupProps = {
  /** Id du watch tout juste créé — `null` ferme/masque le popup. */
  watchId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function WatchContextPopup({ watchId, onOpenChange }: WatchContextPopupProps) {
  const updateContext = useUpdateWatchContext();
  const [support, setSupportState] = useState<WatchSupport | null>(null);
  const [compagnie, setCompagnieState] = useState<WatchCompagnie | null>(null);
  const [emotion, setEmotionState] = useState<WatchEmotion[]>([]);

  // Un watch fraîchement créé n'a jamais de contexte existant à charger —
  // remet juste l'état local à vide à chaque nouveau watchId (le popup est
  // gardé monté, réutilisé pour chaque "marquer comme vu" successif).
  useEffect(() => {
    setSupportState(null);
    setCompagnieState(null);
    setEmotionState([]);
  }, [watchId]);

  if (!watchId) return null;

  const setSupport = (value: WatchSupport | null) => {
    setSupportState(value);
    updateContext.mutate({ watchId, data: { support: value } });
  };
  const setCompagnie = (value: WatchCompagnie | null) => {
    setCompagnieState(value);
    updateContext.mutate({ watchId, data: { compagnie: value } });
  };
  const toggleEmotion = (value: WatchEmotion) => {
    const next = emotion.includes(value)
      ? emotion.filter((v) => v !== value)
      : [...emotion, value];
    setEmotionState(next);
    updateContext.mutate({ watchId, data: { emotion: next.length > 0 ? next : null } });
  };

  return (
    <Dialog open={!!watchId} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contexte de visionnage</DialogTitle>
          <DialogDescription>
            Optionnel — comment avez-vous regardé ? Modifiable plus tard
            depuis l&apos;historique.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Support</span>
            <ChipGroup options={WATCH_SUPPORT_OPTIONS} value={support} onSelect={setSupport} />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Compagnie</span>
            <ChipGroup options={WATCH_COMPAGNIE_OPTIONS} value={compagnie} onSelect={setCompagnie} />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              Émotion (plusieurs choix possibles)
            </span>
            <MultiChipGroup options={WATCH_EMOTION_OPTIONS} values={emotion} onToggle={toggleEmotion} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Terminé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
