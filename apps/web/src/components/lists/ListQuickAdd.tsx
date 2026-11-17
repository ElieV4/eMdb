/**
 * Module "Ajout rapide" d'une liste : barre de recherche intégrée et
 * résultats sur une seule ligne défilante (même présentation que le module
 * "Titres recommandés" de la page titre : mêmes cartes `TitleCard` compactes,
 * à la taille d'affiche réglée dans les paramètres), avec un bouton
 * « Ajouter » sous chaque carte.
 *
 * Un résultat TMDB pas encore en base est importé à la volée avant l'ajout
 * (même mécanisme que le menu d'actions rapides des cartes). Les titres déjà
 * présents dans la liste sont signalés et non ajoutables.
 *
 * Affiché seulement si l'utilisateur peut ajouter des titres à la liste
 * (`capabilities.canAddItems` : créateur, ou membre en mode `ouvert`).
 */

"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { useDebouncedTitleSearch } from "@/hooks/api/useSearch";
import { useAddListItem } from "@/hooks/api/useAddListItem";
import { useGetOrImportTitle } from "@/hooks/api/useGetOrImportTitle";
import { TitleCard } from "@/components/titles/TitleCard";
import { Button } from "@/components/ui/button";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { usePosterScale } from "@/hooks/usePosterScale";
import { Input } from "@/components/ui/input";
import { TitleSearchResult } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface ListQuickAddProps {
  /** Liste où ajouter (action par défaut). */
  listId?: string;
  /** Ids locaux des titres déjà « faits » (dans la liste…) : non ajoutables. */
  existingTitleIds: Set<string>;
  /** Action personnalisée (ex. historique : marquer comme vu aujourd'hui). */
  onAdd?: (titleId: string) => Promise<unknown>;
  /** Libellés du bouton : action, et état fait. */
  addLabel?: string;
  doneLabel?: string;
  /** Texte d'aide sous la barre de recherche. */
  hint?: string;
  className?: string;
}

const MIN_QUERY_LENGTH = 2;

export function ListQuickAdd({
  listId,
  existingTitleIds,
  onAdd,
  addLabel = "Ajouter",
  doneLabel = "Dans la liste",
  hint = "Tapez au moins 2 caractères pour chercher un titre et l'ajouter à la liste.",
  className,
}: ListQuickAddProps) {
  const [query, setQuery] = useState("");
  // Clé du résultat (id local ou tmdb_id) en cours d'ajout, et ajoutés pendant
  // cette session (affichés "Ajouté" avant même le rechargement de la liste).
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data: results, isFetching, isDebouncing, debouncedQuery } = useDebouncedTitleSearch(query);
  const addListItem = useAddListItem();
  const getOrImportTitle = useGetOrImportTitle();
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();
  // Même largeur que les cartes compactes de TitleCard (150 px × réglage).
  const cardWidth = Math.round(150 * usePosterScale());

  const searching = query.trim().length >= MIN_QUERY_LENGTH;
  const loading = searching && (isDebouncing || isFetching) && !results;

  const resultKey = (title: TitleSearchResult) => (title.local ? title.id : `tmdb-${title.tmdbId}`);
  const isInList = (title: TitleSearchResult) =>
    addedKeys.has(resultKey(title)) || (title.local && existingTitleIds.has(title.id));

  const handleAdd = async (title: TitleSearchResult) => {
    const key = resultKey(title);
    setError(null);
    setPendingKey(key);
    try {
      let titleId = title.id;
      if (!title.local) {
        if (!title.tmdbId) throw new Error("Titre sans identifiant TMDB");
        titleId = (await getOrImportTitle.mutateAsync({ tmdbId: title.tmdbId, type: title.type })).id;
      }
      if (onAdd) await onAdd(titleId);
      else if (listId) await addListItem.mutateAsync({ listId, titleId });
      setAddedKeys((prev) => new Set(prev).add(key));
    } catch {
      setError(`Impossible d'ajouter « ${title.titre} » à la liste.`);
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <section className={cn("space-y-4", className)} aria-label="Ajout rapide">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Ajout rapide</h2>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un film ou une série…"
            aria-label="Rechercher un titre à ajouter"
            className="pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!searching ? (
        <p className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : loading ? (
        <div className="flex gap-4 overflow-hidden pb-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] shrink-0 animate-pulse rounded-lg bg-muted" style={{ width: cardWidth }} />
          ))}
        </div>
      ) : results && results.length > 0 ? (
        <ul className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" aria-label={`Résultats pour ${debouncedQuery}`}>
          {results.map((title) => {
            const key = resultKey(title);
            const inList = isInList(title);
            const pending = pendingKey === key;
            return (
              <li key={key} className="shrink-0 space-y-2" style={{ width: cardWidth }}>
                <TitleCard
                  title={title}
                  compact
                  showType={false}
                  watched={title.local ? watchedTitles?.has(title.id) : undefined}
                  inWatchlist={title.local ? watchlistIds.has(title.id) : undefined}
                  inFavorites={title.local ? favoriteIds.has(title.id) : undefined}
                />
                <Button
                  type="button"
                  size="sm"
                  variant={inList ? "secondary" : "outline"}
                  className="w-full"
                  onClick={() => handleAdd(title)}
                  disabled={inList || pendingKey !== null}
                  aria-label={inList ? `${title.titre} est dans la liste` : `Ajouter ${title.titre} à la liste`}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : inList ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {inList ? doneLabel : addLabel}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun titre trouvé pour « {debouncedQuery} ».</p>
      )}
    </section>
  );
}
