/**
 * Page historique : visionnages de l'utilisateur.
 * Route : /history
 * Backend : GET /watches
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useWatches } from "@/hooks/api/useWatches";
import { useDeleteWatch } from "@/hooks/api/useDeleteWatch";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { parseTitleFilters } from "@/lib/titleFilters";

export default function HistoryPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const searchParams = useSearchParams();
  // Seul le filtre type (film/série) s'applique ici : les visionnages ne
  // portent pas les genres/pays/note du titre (donnée non disponible sans
  // changement backend plus large).
  const filters = parseTitleFilters(searchParams);
  const { data, isLoading, error } = useWatches({
    limit: 20,
    type: filters.type !== "tout" ? filters.type : undefined,
  });
  const deleteWatch = useDeleteWatch();

  if (isAuthLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Historique</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir votre historique de visionnage.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Historique</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vos derniers visionnages
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement de l&apos;historique.
            </AlertDescription>
          </Alert>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filters.type !== "tout"
              ? "Aucun visionnage ne correspond au filtre actif."
              : "Vous n'avez encore rien marqué comme vu."}
          </p>
        ) : (
          <div className="space-y-3">
            {data.items.map((watch) => {
              const label = watch.episodes
                ? `${watch.titles?.titre_vf || watch.titles?.titre_vo || "Série"} — Épisode ${watch.episodes.numero}`
                : watch.titles?.titre_vf || watch.titles?.titre_vo || "Titre inconnu";
              const href = watch.episodes
                ? `/episodes/${watch.episodes.id}`
                : `/titles/${watch.title_id}`;

              return (
                <div
                  key={watch.id}
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <Link href={href} className="flex-1 hover:underline">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(watch.date_vue).toLocaleDateString("fr-FR")}
                    </p>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWatch.mutate(watch.id)}
                    disabled={deleteWatch.isPending}
                  >
                    Supprimer
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
