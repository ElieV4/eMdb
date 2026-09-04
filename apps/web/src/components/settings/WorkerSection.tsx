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
import { useAuthStore } from "@/store/authStore";
import { useWorkerStatus, useToggleWorker } from "@/hooks/api/useWorkerToggle";

const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
  process.env.ADMIN_EMAILS ??
  ""
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function WorkerSection() {
  const { user } = useAuthStore();
  const isAdmin =
    !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const { data: status, isLoading } = useWorkerStatus();
  const mutation = useToggleWorker();

  if (!isAdmin) return null;

  const running = status?.running ?? false;

  function handleToggle() {
    mutation.mutate(running ? "pause" : "resume");
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Worker</h2>

      {!isLoading && status && !status.embedEnabled ? (
        <p className="text-sm text-muted-foreground">
          Worker non embarqué dans ce service (EMBED_WORKER≠true) — rien à
          contourner ici.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Coupe le worker BullMQ embarqué pour stopper sa consommation de
            commandes Redis (utile en urgence si le quota Upstash approche de
            sa limite).
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={isLoading || mutation.isPending}
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
