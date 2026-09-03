/**
 * Bouton "Importer depuis Trakt" (bug #55/#56) — bas de la page Profil.
 *
 * Flux : sélection du .zip -> étape de config (date de départ optionnelle,
 * pour un réimport incrémental) -> upload + dézippage côté API -> job BullMQ
 * (potentiellement long, ~20-30 min sur un import complet) -> polling du
 * statut toutes les 2s -> barre de progression "X / Y titres importés" ->
 * état "Import terminé".
 */

"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useUploadTraktExport,
  useTraktImportStatus,
} from "@/hooks/api/useImportTrakt";

export function TraktImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  // Fichier choisi, en attente de confirmation (étape "config" avant l'upload
  // réel) — permet de proposer une date de départ sans upload immédiat au
  // choix du fichier.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sinceDate, setSinceDate] = useState("");

  const upload = useUploadTraktExport();
  const statusQuery = useTraktImportStatus(jobId);
  const status = statusQuery.data;

  const isConfiguring = !!pendingFile && !upload.isPending && !jobId;
  const isUploading = upload.isPending;
  const isDone = status?.status === "completed";
  const isFailed = status?.status === "failed" || upload.isError;

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setJobId(null);
    setSinceDate("");
    setPendingFile(file);
    setOpen(true);
  }

  function handleStartImport() {
    if (!pendingFile) return;
    upload.mutate(
      { file: pendingFile, sinceDate: sinceDate || undefined },
      { onSuccess: (data) => setJobId(data.jobId) },
    );
  }

  function handleClose() {
    setOpen(false);
    setJobId(null);
    setPendingFile(null);
    setSinceDate("");
    upload.reset();
  }

  const progress = status?.progress;
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.imported / progress.total) * 100))
      : 0;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={handleFileSelected}
      />
      <Button type="button" variant="outline" onClick={handlePickFile}>
        <Upload className="mr-2 h-4 w-4" />
        Importer depuis Trakt
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
        <DialogContent showCloseButton={isDone || isFailed || isConfiguring}>
          <DialogHeader>
            <DialogTitle>Import Trakt</DialogTitle>
            <DialogDescription>
              {isDone
                ? "Import terminé."
                : isFailed
                  ? "L'import a échoué."
                  : isConfiguring
                    ? "Un import complet peut prendre plusieurs dizaines de minutes. Pour un réimport (mise à jour de l'historique déjà importé), limiter la date de départ accélère nettement l'opération."
                    : "Import de votre historique Trakt en cours. Cette opération peut prendre plusieurs dizaines de minutes."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isConfiguring && (
              <div className="space-y-2">
                <label htmlFor="trakt-since-date" className="text-sm font-medium">
                  Importer les visionnages depuis (optionnel)
                </label>
                <Input
                  id="trakt-since-date"
                  type="date"
                  value={sinceDate}
                  onChange={(e) => setSinceDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Laisser vide pour importer tout l&apos;historique. Les notes et
                  listes (watchlist, favoris, collection) sont toujours
                  importées en entier, quelle que soit cette date.
                </p>
              </div>
            )}

            {isUploading && !status && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi et analyse du fichier...
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
                      ? `${progress.imported} / ${progress.total} titres importés`
                      : "Analyse de l'export en cours..."}
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
                    <li>{status.result.titlesImported} nouveaux titres importés depuis TMDB</li>
                    <li>{status.result.watches} visionnages importés</li>
                    <li>{status.result.watchedMovies} films vus importés</li>
                    <li>{status.result.ratings} notes importées</li>
                    <li>{status.result.listsImported} éléments de watchlist importés</li>
                  </ul>
                )}
              </div>
            )}
          </div>

          {isConfiguring && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="button" onClick={handleStartImport}>
                Lancer l&apos;import
              </Button>
            </DialogFooter>
          )}

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
