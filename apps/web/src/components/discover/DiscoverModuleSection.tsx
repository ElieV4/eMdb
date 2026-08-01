/**
 * Section d'un module "Découvrir" (Tendances/Populaires/Attendus/Sorties).
 * Deux variantes (modification N) :
 * - "row" : une seule ligne scrollable + carte "Voir davantage" vers la
 *   page dédiée du module — utilisée par l'aperçu `/discover`.
 * - "grid" : grille classique pouvant s'étaler sur plusieurs lignes — page
 *   dédiée `/discover/[module]`, la cible du "Voir davantage" ci-dessus.
 */

"use client";

import { TitleCard } from "@/components/titles/TitleCard";
import { CardSlider } from "@/components/common/CardSlider";
import { useDiscoverModule, DiscoverModuleKey } from "@/hooks/api/useDiscover";
import { useWatchedTitles, useListMembership } from "@/hooks/api";

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
  const { data, isLoading, error } = useDiscoverModule(moduleKey, variant === "grid" ? 40 : 20);
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  const visible = variant === "row" ? (data ?? []).slice(0, ROW_PREVIEW_COUNT) : data ?? [];
  const hasMore = variant === "row" && (data?.length ?? 0) > ROW_PREVIEW_COUNT;

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
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Aucun titre à afficher pour le moment.
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
      )}
    </section>
  );
}
