/**
 * Module "Worker" — visible uniquement par l'administrateur (même pattern
 * que AccountRequestsSection.tsx). Permet de couper/relancer le worker
 * BullMQ embarqué en prod (Render, EMBED_WORKER=true) sans redéploiement :
 * utile en urgence quand le quota gratuit Upstash (500k commandes Redis/mois)
 * approche de sa limite, pour éviter que le manque de commandes Redis fasse
 * tomber le reste du site.
 */

"use client";

import { PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkerStatus, useToggleWorker } from "@/hooks/api/useWorkerToggle";

export function WorkerSection() {
  const { data: status, isLoading, isError } = useWorkerStatus();
  const mutation = useToggleWorker();

  // 401/403 (AdminGuard) = utilisateur non-admin : section masquée. On
  // n'affiche rien tant qu'on ne sait pas encore (évite un flash du bouton
  // avant la réponse), plutôt que de deviner via une liste d'emails
  // dupliquée côté client (cf. commentaire useIsAdmin.ts).
  if (isError || isLoading || !status) return null;

  const running = status?.running ?? false;

  function handleToggle() {
    mutation.mutate(running ? "pause" : "resume");
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Worker</h2>

      {!status.embedEnabled ? (
        <p className="text-sm text-muted-foreground">
          Worker non embarqué dans ce service (EMBED_WORKER≠true) — rien à
          contourner ici.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Coupe le worker BullMQ embarqué pour stopper sa consommation de
            commandes Redis (utile en urgence si le quota Upstash approche de sa
            limite).
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={mutation.isPending}
          >
            {running ? (
              <PauseCircle className="text-destructive" />
            ) : (
              <PlayCircle className="text-emerald-600" />
            )}
            {mutation.isPending
              ? "..."
              : running
                ? "Couper le worker"
                : "Relancer le worker"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Worker : {running ? "actif" : "en pause"}
            {status?.paused ? " (coupé manuellement)" : ""}
          </p>

          {mutation.isError && (
            <p className="text-xs text-destructive">
              Échec de l&apos;action. Vérifiez que vous êtes administrateur.
            </p>
          )}
        </>
      )}
    </section>
  );
}
