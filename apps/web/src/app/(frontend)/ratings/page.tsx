/**
 * Page des notes de l'utilisateur.
 *
 * Phase 4.2 — Ratings
 */

export const dynamic = 'force-dynamic';

import { useUserRatings } from "@/hooks/api/useUserRatings";
import { RatingBadge } from "@/components/ratings/RatingBadge";
import { useDeleteRating } from "@/hooks/api/useDeleteRating";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function RatingsPage() {
  const { data, isLoading, error } = useUserRatings({ limit: 20 });
  const deleteRating = useDeleteRating();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <h1 className="text-3xl font-bold mb-6">Mes notes</h1>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Mes notes</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des notes.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Mes notes</h1>
      {!data || data.items.length === 0 ? (
        <p className="text-muted-foreground">
          Vous n'avez pas encore de notes.
        </p>
      ) : (
        <div className="space-y-4">
          {data.items.map((rating) => {
            const titleName = rating.title
              ? (rating.title as any)?.titre_vf ||
                (rating.title as any)?.titre_vo
              : rating.episode
                ? `S${(rating.episode as any).seasons?.numero ?? "?"}E${rating.episode.numero}`
                : "Titre inconnu";

            return (
              <div
                key={rating.id}
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div className="flex-1">
                  <p className="font-medium">{titleName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(rating.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  {rating.commentaire && (
                    <p className="text-sm mt-1 line-clamp-2">
                      {rating.commentaire}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <RatingBadge note={rating.note} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRating.mutate(rating.id)}
                    disabled={deleteRating.isPending}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
