/**
 * Section d'un module "Découvrir" (Tendances/Populaires/Attendus/Sorties).
 * Deux variantes (modification N) :
 * - "row" : une seule ligne scrollable + carte "Voir davantage" vers la
 *   page dédiée du module — utilisée par l'aperçu `/discover`.
 * - "grid" : grille classique pouvant s'étaler sur plusieurs lignes — page
 *   dédiée `/discover/[module]`, la cible du "Voir davantage" ci-dessus.
 *
 * Applique les filtres du header (modification O) : type, année de sortie,
 * note IMDB, statut vu, listes. Le genre et le pays ne sont PAS filtrables
 * ici — les réponses TMDB trending/discover consommées par ce module ne
 * portent ni genre_ids ni pays sous une forme reliée à nos ids locaux
 * (contrairement au reste de l'app, où les titres sont enrichis depuis la
 * base) ; les appliquer nécessiterait un changement backend (mapper les
 * genre_ids TMDB vers `genres.tmdb_id`), hors-scope ici.
 */

"use client";

import { useSearchParams } from "next/navigation";
import { TitleCard } from "@/components/titles/TitleCard";
import { CardSlider } from "@/components/common/CardSlider";
import { useDiscoverModule, DiscoverModuleKey } from "@/hooks/api/useDiscover";
import { useWatchedTitles, useListMembership, useLists } from "@/hooks/api";
import { useAuth } from "@/hooks/auth/useAuth";
import { useProgressiveReveal } from "@/hooks/useProgressiveReveal";
import {
  parseTitleFilters,
  titleMatchesFilters,
  buildListIdsByTitle,
  FilterableTitle,
} from "@/lib/titleFilters";
import { TitleSearchResult } from "@/lib/types/api";

export const DISCOVER_MODULES: { key: DiscoverModuleKey; title: string; subtitle: string }[] = [
  { key: "tendances", title: "Tendances", subtitle: "Ce qui buzz cette semaine" },
  { key: "populaires", title: "Populaires", subtitle: "Les films et séries les plus populaires" },
  { key: "attendus", title: "Attendus", subtitle: "Pas encore sortis, déjà très suivis" },
  { key: "sorties", title: "Sorties", subtitle: "Sorti récemment" },
];

const ROW_PREVIEW_COUNT = 10;

export function DiscoverModuleSection({
  moduleKey,
  title,
  subtitle,
  variant = "row",
  moreHref,
}: {
  moduleKey: DiscoverModuleKey;
  title: string;
  subtitle: string;
  variant?: "row" | "grid";
  moreHref?: string;
}) {
  const { data, isLoading, error } = useDiscoverModule(moduleKey, variant === "grid" ? 100 : 20);
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();
  const { isAuthenticated } = useAuth();
  const { data: userLists } = useLists(isAuthenticated);
  const listIdsByTitle = buildListIdsByTitle(userLists);
  const filters = parseTitleFilters(useSearchParams());

  const toFilterable = (t: TitleSearchResult): FilterableTitle => ({
    id: t.id,
    type: t.type,
    year: t.dateSortie ? new Date(t.dateSortie).getFullYear() : null,
    note: t.note ?? null,
    genreIds: undefined,
    countryIds: undefined,
    listIds: listIdsByTitle.get(t.id) ?? [],
    watched: watchedTitles?.has(t.id) ?? false,
  });

  const filtered = (data ?? []).filter((t) => titleMatchesFilters(toFilterable(t), filters));
  // Scroll infini côté client sur la grille (page dédiée /discover/:module) —
  // le backend fournit déjà jusqu'à 100 résultats (plusieurs pages TMDB
  // fusionnées), révélés progressivement plutôt que tous rendus d'un coup.
  const { visibleItems: gridVisible, sentinelRef } = useProgressiveReveal(filtered, 24);
  const visible = variant === "row" ? filtered.slice(0, ROW_PREVIEW_COUNT) : gridVisible;
  const hasMore = variant === "row" && filtered.length > ROW_PREVIEW_COUNT;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[150px] aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground py-4">
          Erreur lors du chargement de ce module.
        </p>
      ) : !data || filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {data && data.length > 0
            ? "Aucun titre ne correspond aux filtres actifs."
            : "Aucun titre à afficher pour le moment."}
        </p>
      ) : variant === "row" ? (
        <CardSlider moreHref={hasMore ? moreHref : undefined}>
          {visible.map((t) => (
            <TitleCard
              key={`${moduleKey}-${t.id}`}
              title={t}
              compact
              className="shrink-0"
              watched={watchedTitles?.has(t.id)}
              inWatchlist={watchlistIds.has(t.id)}
              inFavorites={favoriteIds.has(t.id)}
            />
          ))}
        </CardSlider>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {visible.map((t) => (
              <TitleCard
                key={`${moduleKey}-${t.id}`}
                title={t}
                compact
                watched={watchedTitles?.has(t.id)}
                inWatchlist={watchlistIds.has(t.id)}
                inFavorites={favoriteIds.has(t.id)}
              />
            ))}
          </div>
          <div ref={sentinelRef} />
        </>
      )}
    </section>
  );
}
