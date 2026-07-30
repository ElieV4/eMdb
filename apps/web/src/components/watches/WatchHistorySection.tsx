/**
 * Section d'historique des visionnages pour la page d'accueil.
 *
 * Phase 4.1 — Watches
 */

"use client";

import { useWatches } from "@/hooks/api/useWatches";
import { WatchHistoryItem } from "@/components/watches/WatchHistoryItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type WatchHistorySectionProps = {
  className?: string;
};

export function WatchHistorySection({ className }: WatchHistorySectionProps) {
  const { data, isLoading, error } = useWatches({ limit: 10 });

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement de l'historique.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <p>Aucun visionnage pour le moment.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-xl font-semibold">Continuer le visionnage</h2>
      <div className="space-y-2">
        {data.items.slice(0, 5).map((watch) => (
          <WatchHistoryItem key={watch.id} watch={watch} />
        ))}
      </div>
    </div>
  );
}
