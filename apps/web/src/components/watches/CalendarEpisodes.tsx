/**
 * Liste des épisodes non vus pour le calendrier.
 * Affiche les séries suivies avec leur nombre d'épisodes non vus.
 *
 * Phase 4.1 — Watches
 */

"use client";

import { useCalendar } from "@/hooks/api/useCalendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Tv } from "lucide-react";
import Link from "next/link";
import { CalendarEntry } from "@/lib/types/api";

export function CalendarEpisodes() {
  const { data: entries, isLoading, error } = useCalendar();

  if (isLoading) {
    return (
      <div className="space-y-3">
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
          Erreur lors du chargement du calendrier.
        </AlertDescription>
      </Alert>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Tv className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Aucun épisode à venir pour le moment.</p>
      </div>
    );
  }

  // Regrouper par série
  const grouped = entries.reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
    if (!acc[entry.title_id]) acc[entry.title_id] = [];
    acc[entry.title_id].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([titleId, episodes]) => {
        const first = episodes[0];
        return (
          <Card key={titleId} className="p-4">
            <div className="flex items-start gap-4">
              <img
                src={first.affiche_url || "/placeholder-poster.png"}
                alt={first.titre_vo}
                className="w-16 h-24 object-cover rounded"
              />
              <div className="flex-1">
                <Link
                  href={`/titles/${titleId}`}
                  className="font-semibold hover:underline"
                >
                  {first.titre_vf || first.titre_vo}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {episodes.length} épisode{episodes.length > 1 ? "s" : ""} non
                  vu{episodes.length > 1 ? "s" : ""}
                </p>
                <div className="mt-2 space-y-1">
                  {episodes.slice(0, 5).map((ep, idx) => (
                    <div
                      key={idx}
                      className="text-sm flex justify-between text-muted-foreground"
                    >
                      <span>
                        S{String(ep.saison).padStart(2, "0")}E{String(ep.episode_numero).padStart(2, "0")}{" "}
                        {ep.episode_titre}
                      </span>
                      {ep.date_diffusion && (
                        <span>{new Date(ep.date_diffusion).toLocaleDateString("fr-FR")}</span>
                      )}
                    </div>
                  ))}
                  {episodes.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{episodes.length - 5} autres...
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="destructive">{first.nb_non_vus}</Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}