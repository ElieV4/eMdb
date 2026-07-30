/**
 * Page détail d'un épisode.
 * Correspondance backend : GET /episodes/:id, GET /episodes/:id/credits
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft, History, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TitleCredits } from "@/components/titles/TitleCredits";
import { WatchButton } from "@/components/watches/WatchButton";
import { RatingInput } from "@/components/ratings/RatingInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEpisode } from "@/hooks/api/useEpisode";
import { useEpisodeCredits } from "@/hooks/api/useEpisodeCredits";
import { useWatches } from "@/hooks/api/useWatches";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { useUpsertRating } from "@/hooks/api/useUpsertRating";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";

export default function EpisodeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: episode, isLoading, isError } = useEpisode(id);
  const {
    data: credits,
    isLoading: isCreditsLoading,
    isError: isCreditsError,
  } = useEpisodeCredits(id);

  // Fetch watches to determine if this episode is watched
  const { data: watchesData } = useWatches({ limit: 100 });
  const deleteWatch = useDeleteWatch();
  const upsertRating = useUpsertRating();

  const allWatches = watchesData?.items ?? [];
  const episodeWatches = allWatches.filter((w) => w.episode_id === id);
  const watchCount = episodeWatches.length;
  const isWatched = watchCount > 0;

  const handleWatchSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["watches"], exact: false });
  };

  const handleUnwatch = async (watchId: string) => {
    await deleteWatch.mutateAsync(watchId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (isError || !episode) {
    return notFound();
  }

  const {
    numero,
    titre,
    synopsis,
    date_sortie,
    duree_minutes,
    image_url,
    seasons,
  } = episode;

  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;
  const dateStr = date_sortie
    ? new Date(date_sortie).toLocaleDateString("fr-FR")
    : null;

  const seasonNumero = seasons?.numero ?? 0;
  const titleId = seasons?.title_id ?? "";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Navigation vers la saison */}
        {titleId && (
          <Link
            href={`/series/${titleId}/seasons/${seasonNumero}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la saison {seasonNumero}
          </Link>
        )}

        {/* Header épisode */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Still */}
          <div className="mx-auto md:mx-0 shrink-0">
            <div className="relative h-48 w-36 overflow-hidden rounded-lg bg-muted/20">
              {image_url ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${image_url}`}
                  alt={titre}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    Pas d'image
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Infos */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{titre}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Saison {seasonNumero} • Épisode {numero}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {year && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{dateStr}</span>
                </span>
              )}
              {duree_minutes && (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{duree_minutes} min</span>
                </span>
              )}
            </div>

            {synopsis && (
              <p className="text-sm text-muted-foreground">{synopsis}</p>
            )}
          </div>
        </div>

        {/* Actions utilisateur */}
        {isAuthenticated && (
          <div className="flex flex-wrap items-center gap-3 border-y py-4">
            <WatchButton
              episodeId={id}
              onWatchSuccess={handleWatchSuccess}
              watched={isWatched}
              watchCount={watchCount}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="mr-2 h-4 w-4" />
              Historique
            </Button>
            <RatingInput
              value={null}
              onChange={(value) =>
                upsertRating.mutate({ episode_id: id, note_perso: value })
              }
            />
          </div>
        )}

        {/* Crédits de l'épisode */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Casting de l'épisode</h2>
          {isCreditsLoading ? (
            <LoadingSpinner className="h-6 w-6" />
          ) : isCreditsError || !credits ? (
            <p className="text-sm text-muted-foreground">
              Aucun crédit disponible pour cet épisode.
            </p>
          ) : Object.keys(credits).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun crédit disponible pour cet épisode.
            </p>
          ) : (
            <TitleCredits credits={credits} />
          )}
        </section>
      </div>

      {/* Dialog historique */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historique de visionnage</DialogTitle>
            <DialogDescription>
              Visionnages enregistrés pour cet épisode.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {episodeWatches.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun visionnage pour cet épisode.
              </p>
            )}
            {episodeWatches.map((watch) => (
              <div
                key={watch.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {watch.episodes
                      ? `Épisode ${watch.episodes.numero}${watch.episodes.titre ? ` - ${watch.episodes.titre}` : ""}`
                      : "Épisode"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(watch.date_vue).toLocaleString("fr-FR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUnwatch(watch.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}