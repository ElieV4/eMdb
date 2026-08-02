/**
 * Petit bouton "Actualiser" générique (icône + libellé + spinner pendant la
 * mutation) — réutilisé par les pages titre et personne pour déclencher
 * manuellement un re-import TMDB (casting inclus côté titre).
 */

"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshDataButton({
  onRefresh,
  isPending,
  isError,
  label = "Actualiser",
  pendingLabel = "Actualisation...",
  errorLabel = "Échec de l'actualisation.",
}: {
  onRefresh: () => void;
  isPending: boolean;
  isError?: boolean;
  label?: string;
  pendingLabel?: string;
  errorLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isPending}
      >
        <RefreshCw className={isPending ? "animate-spin" : ""} />
        {isPending ? pendingLabel : label}
      </Button>
      {isError && <p className="text-xs text-destructive">{errorLabel}</p>}
    </div>
  );
}
