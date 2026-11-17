/**
 * Page détail d'une liste : titres qu'elle contient.
 * Route : /lists/:id
 * Backend : GET /lists/:id
 *
 * Applique les filtres du header (type/genre/pays/année/note, bug filtres
 * header sur accueil/watchlist/listes/historique) aux titres affichés.
 *
 * Sous-groupes (?groupe=<id>) : filtre sur un sous-groupe, descendants
 * inclus. Liste partagée : suivi "vu" commun à tous les membres, avec filtre
 * ?vu=vus|non_vus et compteur.
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
import { ListGroupsBar } from "@/components/lists/ListGroupsBar";
import { ListQuickAdd } from "@/components/lists/ListQuickAdd";
import { TitlesTable } from "@/components/titles/TitlesTable";
import { ViewModeToggle } from "@/components/titles/ViewModeToggle";
import { useViewMode } from "@/hooks/useViewMode";
import { ListItemOverlay } from "@/components/lists/ListItemOverlay";
import { ItemGroupsDialog } from "@/components/lists/ItemGroupsDialog";
import { ItemCommentsDialog } from "@/components/lists/ItemCommentsDialog";
import { useSetItemVu } from "@/hooks/api/useListGroups";
import { itemInGroup } from "@/lib/listGroups";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { BackButton } from "@/components/common/BackButton";
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
import { SHARE_MODE_LABELS } from "@/lib/shareModes";
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
  const [rangerItemId, setRangerItemId] = useState<string | null>(null);
  const [commentsItemId, setCommentsItemId] = useState<string | null>(null);
  const setItemVu = useSetItemVu();
  const [viewMode, setViewMode] = useViewMode("list");

  const filters = parseTitleFilters(searchParams);
  const listIdsByTitle = buildListIdsByTitle(allLists);

  // Filtre de progression (watchlist uniquement — modification T/pendant du
  // module déjà présent sur /watchlist) : "tous" (défaut), "a_jour",
  // "en_cours", "abandonnee". Sans objet pour les listes personnalisées/
  // favoris, qui n'ont pas de notion de statut de progression.
  const progressionFilter = searchParams.get("progression") ?? "tous";
  const selectedGroupId = searchParams.get("groupe");
  const vuFilter = searchParams.get("vu") ?? "tous";

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

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
  const isMember = list?.role === "member";
  // Le suivi "vu" n'a de sens que pour une liste réellement partagée.
  const isShared = isMember || (list?.member_count ?? 0) > 0;
  const groups = list?.groups ?? [];
  const activeGroupId =
    selectedGroupId && groups.some((g) => g.id === selectedGroupId) ? selectedGroupId : null;
  const items = list?.items ?? [];
  const filteredItems = items.filter((item) => {
    if (
      !titleMatchesFilters(
        toFilterableTitle(item, { watchedTitleIds: watchedTitles, listIdsByTitle }),
        filters,
      )
    )
      return false;
    if (activeGroupId && !itemInGroup(item.groupIds ?? [], groups, activeGroupId)) return false;
    if (isShared && vuFilter === "vus" && !item.vu) return false;
    if (isShared && vuFilter === "non_vus" && item.vu) return false;
    if (!isWatchlist || progressionFilter === "tous") return true;
    // Les films n'ont pas de statut de progression — retirés quand un
    // filtre de progression est actif (cohérent avec /watchlist).
    if (item.type === "film") return false;
    return (item.statut ?? "en_cours") === progressionFilter;
  });

  const groupCounts = new Map(
    groups.map((g) => [g.id, items.filter((i) => itemInGroup(i.groupIds ?? [], groups, g.id)).length]),
  );
  const vuCount = items.filter((i) => i.vu).length;
  const rangerItem = items.find((i) => i.id === rangerItemId) ?? null;
  const commentsItem = items.find((i) => i.id === commentsItemId) ?? null;
  const canEditItems = list?.capabilities.canEditItems ?? false;
  const groupNames = (ids: string[]) =>
    groups
      .filter((g) => ids.includes(g.id))
      .map((g) => g.nom)
      .join(", ");
  const commentCountOf = (item?: (typeof items)[number]) =>
    item ? (item.commentCount ?? 0) + (item.memberComments?.length ?? 0) + (item.myComment ? 1 : 0) : 0;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <BackButton />

        <div>
          <Link
            href="/lists"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {isMember ? "Listes partagées" : "Mes listes"}
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
                  {isMember && (
                    <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
                      Partagée · {SHARE_MODE_LABELS[list.share_mode]}
                    </span>
                  )}
                </div>
                {isMember && list.owner && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Créée par {list.owner.pseudo}
                  </p>
                )}
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
                  capabilities={list.capabilities}
                  role={list.role}
                  variant="buttons"
                  onEditContent={() => setEditMode(true)}
                  onDeleted={() => router.push("/lists")}
                />
              )}
            </div>
          ) : null}
        </div>

        {list && list.capabilities.canAddItems && !editMode && !isLoading && !error && (
          <ListQuickAdd listId={list.id} existingTitleIds={new Set(items.map((i) => i.id))} />
        )}

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

        {list && !editMode && !isLoading && !error && (
          <ListGroupsBar
            listId={list.id}
            groups={groups}
            capabilities={list.capabilities}
            counts={groupCounts}
            totalCount={items.length}
            selectedGroupId={activeGroupId}
            onSelect={(groupId) => setParam("groupe", groupId)}
          />
        )}

        {isShared && !editMode && !isLoading && !error && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1 rounded-lg border p-1 w-fit">
              {[
                { value: "tous", label: "Tous" },
                { value: "vus", label: "Vus" },
                { value: "non_vus", label: "Pas vus" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={vuFilter === option.value}
                  onClick={() => setParam("vu", option.value === "tous" ? null : option.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    vuFilter === option.value
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {vuCount}/{items.length} vu{vuCount > 1 ? "s" : ""} dans la liste
            </span>
          </div>
        )}

        {!editMode && !isLoading && !error && items.length > 0 && (
          <div className="flex justify-end">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
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
            {list?.capabilities.canAddItems
              ? "Cette liste est vide. Ajoutez des titres avec l'ajout rapide ci-dessus ou depuis leur fiche."
              : "Cette liste est vide."}
          </p>
        ) : editMode ? (
          // Mode édition : glisser-déposer + retrait en un clic, sur la
          // liste complète non filtrée (réordonner un sous-ensemble filtré
          // réattribuerait des positions incohérentes aux items masqués).
          <ListReorder
            listId={list?.id ?? ""}
            items={items.map(titleToSearchResult)}
            canRemove={list?.capabilities.canRemoveItems ?? false}
            groups={groups}
            groupIdsByTitle={new Map(items.map((i) => [i.id, i.groupIds ?? []]))}
            canEditGroups={canEditItems}
          />
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {activeGroupId
              ? "Aucun titre rangé dans ce sous-groupe ne correspond aux filtres actifs."
              : "Aucun titre de cette liste ne correspond aux filtres actifs."}
          </p>
        ) : viewMode === "tableau" ? (
          <TitlesTable
            titles={filteredItems.map(titleToSearchResult)}
            flagsOf={(t) => ({
              watched: watchedTitles?.has(t.id),
              inWatchlist: watchlistIds.has(t.id),
              inFavorites: favoriteIds.has(t.id),
            })}
            extraColumns={[
              ...(isShared
                ? [
                    {
                      id: "vuListe",
                      label: "Vu dans la liste",
                      sortValue: (t: TitleSearchResult) =>
                        filteredItems.find((i) => i.id === t.id)?.vu ? 1 : 0,
                      render: (t: TitleSearchResult) => {
                        const item = filteredItems.find((i) => i.id === t.id);
                        if (!item) return null;
                        return canEditItems && list ? (
                          <button
                            type="button"
                            onClick={() =>
                              setItemVu.mutate({ listId: list.id, titleId: item.id, vu: !item.vu })
                            }
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs",
                              item.vu ? "border-emerald-600 text-emerald-500" : "text-muted-foreground",
                            )}
                            aria-label={`${item.vu ? "Marquer comme pas vu" : "Marquer comme vu"} dans la liste : ${item.titre}`}
                          >
                            {item.vu ? "Vu" : "Pas vu"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{item.vu ? "Vu" : "Pas vu"}</span>
                        );
                      },
                    },
                  ]
                : []),
              ...(groups.length > 0
                ? [
                    {
                      id: "groupes",
                      label: "Sous-groupes",
                      sortValue: (t: TitleSearchResult) =>
                        groupNames(filteredItems.find((i) => i.id === t.id)?.groupIds ?? []) || null,
                      render: (t: TitleSearchResult) => {
                        const item = filteredItems.find((i) => i.id === t.id);
                        const names = groupNames(item?.groupIds ?? []);
                        return canEditItems ? (
                          <button
                            type="button"
                            onClick={() => setRangerItemId(t.id)}
                            className="text-left text-xs text-muted-foreground hover:text-foreground"
                            aria-label={`Ranger dans des sous-groupes : ${t.titre}`}
                          >
                            {names || "Ranger…"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{names || "—"}</span>
                        );
                      },
                    },
                  ]
                : []),
              {
                id: "commentaires",
                label: "Commentaires",
                sortValue: (t: TitleSearchResult) => commentCountOf(filteredItems.find((i) => i.id === t.id)),
                render: (t: TitleSearchResult) => (
                  <button
                    type="button"
                    onClick={() => setCommentsItemId(t.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    aria-label={`Commentaires : ${t.titre}`}
                  >
                    {commentCountOf(filteredItems.find((i) => i.id === t.id)) || "Écrire"}
                  </button>
                ),
              },
            ]}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredItems.map((title) => (
              <div key={title.id} className="relative">
                <TitleCard
                  title={titleToSearchResult(title)}
                  compact
                  watched={watchedTitles?.has(title.id)}
                  inWatchlist={watchlistIds.has(title.id)}
                  inFavorites={favoriteIds.has(title.id)}
                  watchlistStatus={title.statut}
                />
                <ListItemOverlay
                  titre={title.titre}
                  showVu={isShared}
                  vu={title.vu}
                  vuBy={title.vuBy}
                  canEdit={canEditItems}
                  onToggleVu={() =>
                    list && setItemVu.mutate({ listId: list.id, titleId: title.id, vu: !title.vu })
                  }
                  showRanger={canEditItems && groups.length > 0}
                  onRanger={() => setRangerItemId(title.id)}
                  onComments={() => setCommentsItemId(title.id)}
                  commentCount={commentCountOf(title)}
                />
              </div>
            ))}
          </div>
        )}

        {list && (
          <ItemCommentsDialog
            open={commentsItem !== null}
            onOpenChange={(open) => !open && setCommentsItemId(null)}
            listId={list.id}
            isShared={isShared}
            item={
              commentsItem
                ? {
                    id: commentsItem.id,
                    titre: commentsItem.titre,
                    myComment: commentsItem.myComment,
                    memberComments: commentsItem.memberComments ?? [],
                  }
                : null
            }
          />
        )}

        {list && (
          <ItemGroupsDialog
            open={rangerItem !== null}
            onOpenChange={(open) => !open && setRangerItemId(null)}
            listId={list.id}
            groups={groups}
            item={
              rangerItem
                ? { id: rangerItem.id, titre: rangerItem.titre, groupIds: rangerItem.groupIds ?? [] }
                : null
            }
          />
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
