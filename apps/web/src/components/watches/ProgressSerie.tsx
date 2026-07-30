/**
 * Barre de progression d'une série par saison.
 * Affiche vus/total par saison et pourcentage global.
 *
 * Phase 4.1 — Watches
 */

"use client";

import { useSerieProgress } from "@/hooks/api/useSerieProgress";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type ProgressSerieProps = {
  titleId: string;
  className?: string;
};

export function ProgressSerie({ titleId, className }: ProgressSerieProps) {
  const { data: progress, isLoading, error } = useSerieProgress(titleId);

  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement de la progression.
        </AlertDescription>
      </Alert>
    );
  }

  if (!progress || progress.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune donnée de progression.
      </p>
    );
  }

  const totalVus = progress.reduce((sum, s) => sum + s.vus, 0);
  const totalEpisodes = progress.reduce((sum, s) => sum + s.total, 0);
  const percentage =
    totalEpisodes > 0 ? Math.round((totalVus / totalEpisodes) * 100) : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Progression globale</span>
        <Badge variant="secondary">{percentage}%</Badge>
      </div>
      <Progress value={percentage} className="mb-4" />
      <p className="text-xs text-muted-foreground mb-3">
        {totalVus} / {totalEpisodes} épisodes vus
      </p>

      <div className="space-y-2">
        {progress.map((saison) => (
          <div
            key={saison.saison}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">
              Saison {saison.saison}
            </span>
            <span>
              {saison.vus}/{saison.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
