/**
 * Bouton "Importer les credits" — bas de la page Profil, à côté de
 * l'import Trakt.
 *
 * Flux : ouverture d'un popup de configuration (types de credits + nombre
 * max d'acteurs par titre) -> appel POST /import/credits -> job BullMQ ->
 * polling du statut toutes les 2s -> barre de progression "X / Y titres"
 * -> état "Import terminé".
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useStartCreditsImport,
  useCreditsImportStatus,
  useCreditsImportPreviewCount,
} from "@/hooks/api/useImportCredits";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "acteur", label: "Acteurs" },
  { value: "realisateur", label: "Réalisateurs" },
  { value: "scenariste", label: "Scénaristes" },
  { value: "autre", label: "Autres (équipe technique)" },
];

const DEFAULT_ROLES = new Set(["acteur", "realisateur"]);
const DEFAULT_MAX_CAST = 10;

export function ImportCreditsButton() {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const [roles, setRoles] = useState<Set<string>>(DEFAULT_ROLES);
  const [limitCast, setLimitCast] = useState(false);
  const [maxCast, setMaxCast] = useState(DEFAULT_MAX_CAST);

  const upload = useStartCreditsImport();
  const statusQuery = useCreditsImportStatus(jobId);
  const status = statusQuery.data;
  const previewCount = useCreditsImportPreviewCount();

  const isUploading = upload.isPending;
  const isDone = status?.status === "completed";
  const isFailed = status?.status === "failed" || upload.isError;
  const isConfiguring = !jobId && !isUploading;

  function toggleRole(value: string) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function handleOpen() {
    setJobId(null);
    upload.reset();
    setOpen(true);
  }

  function handleStart() {
    if (roles.size === 0) return;
    upload.mutate(
      {
        creditRoles: Array.from(roles),
        maxCast: limitCast ? maxCast : undefined,
      },
      {
        onSuccess: (data) => setJobId(data.jobId),
      },
    );
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
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" onClick={handleOpen}>
        <Upload className="mr-2 h-4 w-4" />
        Importer les credits
      </Button>
      {previewCount.data && previewCount.data.count > 0 && (
        <span className="text-sm text-muted-foreground">
          {previewCount.data.count} titre{previewCount.data.count > 1 ? "s" : ""} concerné
          {previewCount.data.count > 1 ? "s" : ""}
        </span>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isDone) {
            handleClose();
          } else if (next || isConfiguring) {
            setOpen(next);
          }
        }}
      >
        <DialogContent showCloseButton={isConfiguring || isDone || isFailed}>
          <DialogHeader>
            <DialogTitle>{isConfiguring ? "Importer les credits" : "Import des credits"}</DialogTitle>
            <DialogDescription>
              {isConfiguring
                ? "Choisissez ce qui sera importé depuis TMDB pour vos titres."
                : isDone
                  ? "Import terminé."
                  : isFailed
                    ? "L'import a échoué."
                    : "Import des credits en cours. Cette opération peut prendre plusieurs minutes."}
            </DialogDescription>
          </DialogHeader>

          {isConfiguring && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Types de credits à importer</Label>
                <div className="flex flex-wrap gap-1 rounded-lg border p-1 w-fit">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleRole(option.value)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        roles.has(option.value)
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {roles.size === 0 && (
                  <p className="text-xs text-destructive">Sélectionnez au moins un type.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={limitCast}
                    onChange={(e) => setLimitCast(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Limiter le nombre d&apos;acteurs importés par titre
                </label>
                {limitCast && (
                  <div className="flex items-center gap-2 pl-6">
                    <Input
                      type="number"
                      min={0}
                      value={maxCast}
                      onChange={(e) => setMaxCast(Math.max(0, Number(e.target.value) || 0))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      acteur{maxCast > 1 ? "s" : ""} max, par ordre de billing
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isConfiguring && (
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
          )}

          {isConfiguring && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={handleStart} disabled={roles.size === 0}>
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
