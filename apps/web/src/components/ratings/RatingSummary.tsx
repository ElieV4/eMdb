/**
 * Résumé public des notes d'un titre (moyenne, répartition, count).
 *
 * Phase 4.2 — Ratings
 */

"use client";

import { useTitleRatingsSummary } from "@/hooks/api/useTitleRatingsSummary";
import { RatingBadge } from "@/components/ratings/RatingBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingSummaryProps = {
  titleId: string;
  className?: string;
};

export function RatingSummary({ titleId, className }: RatingSummaryProps) {
  const { data: summary, isLoading, error } = useTitleRatingsSummary(titleId);

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des notes.
        </AlertDescription>
      </Alert>
    );
  }

  if (!summary || summary.count === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune note pour le moment.
      </p>
    );
  }

  const maxCount = Math.max(...Object.values(summary.repartition));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <RatingBadge note={summary.moyenne} />
        <span className="text-sm text-muted-foreground">
          {summary.count} vote{summary.count > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-1">
        {Array.from({ length: 10 }, (_, i) => {
          const note = i + 1;
          const count = summary.repartition[note] || 0;
          const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={note} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-6">{note}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
