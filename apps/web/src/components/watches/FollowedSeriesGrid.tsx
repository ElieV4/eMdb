/**
 * Grille de séries suivies pour le profil utilisateur.
 *
 * Phase 4.4 — Follows
 */

"use client";

import { useFollows } from "@/hooks/api/useFollows";
import { FollowButton } from "@/components/watches/FollowButton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Tv } from "lucide-react";
import Link from "next/link";
import { buildEntityUrl, cn } from "@/lib/utils";

type FollowedSeriesGridProps = {
  className?: string;
};

export function FollowedSeriesGrid({ className }: FollowedSeriesGridProps) {
  const { data: series, isLoading, error } = useFollows();

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
          className,
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des séries suivies.
        </AlertDescription>
      </Alert>
    );
  }

  if (!series || series.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Tv className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Vous ne suivez aucune série pour le moment.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
        className,
      )}
    >
      {series.map((serie) => (
        <Card key={serie.id} className="p-4">
          <div className="flex gap-4">
            <img
              src={serie.affiche_url || "/placeholder-poster.png"}
              alt={serie.titre_vo}
              className="w-16 h-24 object-cover rounded"
            />
            <div className="flex-1">
              <Link
                href={buildEntityUrl("/titles", serie.id, serie.titre_vf || serie.titre_vo)}
                className="font-semibold hover:underline"
              >
                {serie.titre_vf || serie.titre_vo}
              </Link>
              <p className="text-xs text-muted-foreground mt-1">
                Suivi depuis le{" "}
                {new Date(serie.followed_at).toLocaleDateString("fr-FR")}
              </p>
              {serie.next_episode_air_date && (
                <Badge variant="outline" className="mt-2">
                  Prochain épisode :{" "}
                  {new Date(serie.next_episode_air_date).toLocaleDateString(
                    "fr-FR",
                  )}
                </Badge>
              )}
              <div className="mt-2">
                <FollowButton titleId={serie.id} initialFollowed={true} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
