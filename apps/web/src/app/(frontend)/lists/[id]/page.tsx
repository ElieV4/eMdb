/**
 * Page détail d'une liste : titres qu'elle contient.
 * Route : /lists/:id
 * Backend : GET /lists/:id
 *
 * Applique les filtres du header (type/genre/pays/année/note, bug filtres
 * header sur accueil/watchlist/listes/historique) aux titres affichés.
 */

"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useList } from "@/hooks/api/useList";
import { useLists } from "@/hooks/api/useLists";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { TitleCard } from "@/components/titles/TitleCard";
import { ListActionsMenu } from "@/components/lists/ListActionsMenu";
import { ListReorder } from "@/components/lists/ListReorder";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
import {
  parseTitleFilters,
  titleMatchesFilters,
  toFilterableTitle,
  buildListIdsByTitle,
} from "@/lib/titleFilters";
import { Title, TitleSearchResult } from "@/lib/types/api";
import { cn } from "@/lib/utils";

function titleToSearchResult(title: Title): TitleSearchResult {
  return {
    id: title.id,
    tmdbId: title.tmdbId,
    titre: title.titre,
    titreOriginal: title.titreOriginal,
    type: title.type,
    dateSortie: title.dateSortie,
    duree: title.duree,
    note: title.note,
    afficheUrl: title.afficheUrl,
    genres: title.genres,
    pays: title.pays,
    local: true,
  };
}

const typeLabels: Record<string, string> = {
  watchlist: "Watchlist",
  favoris: "Favoris",
  custom: "Personnalisée",
};

function ListDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: list, isLoading, error } = useList(params.id);
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();
  const { data: allLists } = useLists(isAuthenticated);
  const [editMode, setEditMode] = useState(false);

  const filters = parseTitleFilters(searchParams);
  const listIdsByTitle = buildListIdsByTitle(allLists);

  // Filtre de progression (watchlist uniquement — modification T/pendant du
  // module déjà présent sur /watchlist) : "tous" (défaut), "a_jour",
  // "en_cours", "abandonnee". Sans objet pour les listes personnalisées/
  // favoris, qui n'ont pas de notion de statut de progression.
  const progressionFilter = searchParams.get("progression") ?? "tous";

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
        <h1 className="text-2xl font-bold">Liste</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir cette liste.
        </p>
      </div>
    );
  }

  const isWatchlist = list?.type === "watchlist";
  const items = list?.items ?? [];
  const filteredItems = items.filter((item) => {
    if (
      !titleMatchesFilters(
        toFilterableTitle(item, { watchedTitleIds: watchedTitles, listIdsByTitle }),
        filters,
      )
    )
      return false;
    if (!isWatchlist || progressionFilter === "tous") return true;
    // Les films n'ont pas de statut de progression — retirés quand un
    // filtre de progression est actif (cohérent avec /watchlist).
    if (item.type === "film") return false;
    return (item.statut ?? "en_cours") === progressionFilter;
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <Link
            href="/lists"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Mes listes
          </Link>

          {isLoading ? (
            <Skeleton className="h-8 w-64" />
          ) : list ? (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">
                    {list.nom} ({items.length})
                  </h1>
                  <span className="text-xs rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                    {typeLabels[list.type] ?? list.type}
                  </span>
                </div>
                {list.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {list.description}
                  </p>
                )}
              </div>

              {/* Boutons de gestion (modification S) : les trois actions
                  pour une liste personnalisée, seulement "Modifier le
                  contenu" pour Watchlist/Favoris (listes système, non
                  renommables/non supprimables). En mode édition, remplacés
                  par un simple bouton "Terminé". */}
              {editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  <Check className="h-4 w-4" />
                  Terminé
                </Button>
              ) : (
                <ListActionsMenu
                  list={list}
                  variant="buttons"
                  onEditContent={() => setEditMode(true)}
                  onDeleted={() => router.push("/lists")}
                />
              )}
            </div>
          ) : null}
        </div>

        {isWatchlist && !editMode && !isLoading && !error && items.length > 0 && (
          <div className="flex flex-wrap gap-1 rounded-lg border p-1 w-fit">
            {[
              { value: "tous", label: "Tous" },
              { value: "a_jour", label: "À jour" },
              { value: "en_cours", label: "En cours" },
              { value: "abandonnee", label: "Abandonnée" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (option.value === "tous") {
                    params.delete("progression");
                  } else {
                    params.set("progression", option.value);
                  }
                  const qs = params.toString();
                  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  progressionFilter === option.value
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement de la liste.
            </AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cette liste est vide. Ajoutez des titres depuis leur fiche.
          </p>
        ) : editMode ? (
          // Mode édition : glisser-déposer + retrait en un clic, sur la
          // liste complète non filtrée (réordonner un sous-ensemble filtré
          // réattribuerait des positions incohérentes aux items masqués).
          <ListReorder listId={list?.id ?? ""} items={items.map(titleToSearchResult)} />
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun titre de cette liste ne correspond aux filtres actifs.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredItems.map((title) => (
              <TitleCard
                key={title.id}
                title={titleToSearchResult(title)}
                compact
                watched={watchedTitles?.has(title.id)}
                inWatchlist={watchlistIds.has(title.id)}
                inFavorites={favoriteIds.has(title.id)}
                watchlistStatus={title.statut}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ListDetailPage() {
  return (
    <Suspense fallback={null}>
      <ListDetailPageContent />
    </Suspense>
  );
}
