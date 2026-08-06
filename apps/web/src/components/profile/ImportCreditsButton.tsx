/**
 * Bouton "Importer les credits" — bas de la page Profil, à côté de
 * l'import Trakt.
 *
 * Flux : appel POST /import/credits -> job BullMQ -> polling du statut
 * toutes les 2s -> barre de progression "X / Y titres" -> état
 * "Import terminé".
 */

"use client";

import { useState } from "react";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  useStartCreditsImport,
  useCreditsImportStatus,
} from "@/hooks/api/useImportCredits";

export function ImportCreditsButton() {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const upload = useStartCreditsImport();
  const statusQuery = useCreditsImportStatus(jobId);
  const status = statusQuery.data;

  const isUploading = upload.isPending;
  const isDone = status?.status === "completed";
  const isFailed = status?.status === "failed" || upload.isError;

  function handleOpen() {
    setJobId(null);
    setOpen(true);
    upload.mutate(undefined, {
      onSuccess: (data) => setJobId(data.jobId),
    });
  }

  function handleClose() {
    setOpen(false);
    setJobId(null);
    upload.reset();
  }

  const progress = status?.progress;
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.imported / progress.total) * 100))
      : 0;

  return (
    <div>
      <Button type="button" variant="outline" onClick={handleOpen}>
        <Upload className="mr-2 h-4 w-4" />
        Importer les credits
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isDone) {
            handleClose();
          } else {
            setOpen(next);
          }
        }}
      >
        <DialogContent showCloseButton={isDone || isFailed}>
          <DialogHeader>
            <DialogTitle>Import des credits</DialogTitle>
            <DialogDescription>
              {isDone
                ? "Import terminé."
                : isFailed
                  ? "L'import a échoué."
                  : "Import des credits (acteurs + réalisateurs) en cours. Cette opération peut prendre plusieurs minutes."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isUploading && !status && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Démarrage de l'import...
              </div>
            )}

            {isFailed && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0 translate-y-0.5" />
                <span>
                  {upload.error instanceof Error
                    ? upload.error.message
                    : status?.error ?? "Une erreur est survenue pendant l'import."}
                </span>
              </div>
            )}

            {!isFailed && status && !isDone && (
              <div className="space-y-2">
                <div className="flex w-full items-center justify-between text-sm">
                  <span className="font-medium">
                    {progress && progress.total > 0
                      ? `${progress.imported} / ${progress.total} titres`
                      : "Analyse des titres en cours..."}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{percent}%</span>
                </div>
                <Progress value={percent} />
              </div>
            )}

            {isDone && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Import terminé avec succès.
                </div>
                {status?.result && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>{status.result.titlesProcessed} titres traités</li>
                    <li>{status.result.creditsImported} credits importés</li>
                    <li>{status.result.creditsFailed} échecs</li>
                  </ul>
                )}
              </div>
            )}
          </div>

          {(isDone || isFailed) && (
            <DialogFooter>
              <Button type="button" onClick={handleClose}>
                OK
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
