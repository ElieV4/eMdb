/**
 * Page "Découvrir" (modification G) : 4 modules — Tendances, Populaires,
 * Attendus, Sorties — alimentés en direct par TMDB (contrairement au module
 * "Titres populaires" de l'accueil, qui ne liste que les titres déjà
 * importés en local) : le but est de faire découvrir du contenu externe,
 * importé à la demande au clic sur une affiche (mécanisme "get or import"
 * déjà en place).
 * TMDB n'a pas d'équivalent direct pour "Attendus" (most anticipated) :
 * substitué par les titres non encore sortis triés par popularité TMDB
 * décroissante (algo documenté dans docs/bugs.md, modification G).
 * Correspondance backend : GET /discover/:module
 */

"use client";

import { TitleCard } from "@/components/titles/TitleCard";
import { useDiscoverModule, DiscoverModuleKey } from "@/hooks/api/useDiscover";
import { useWatchedTitles, useListMembership } from "@/hooks/api";

const MODULES: { key: DiscoverModuleKey; title: string; subtitle: string }[] = [
  {
    key: "tendances",
    title: "Tendances",
    subtitle: "Ce qui buzz cette semaine",
  },
  {
    key: "populaires",
    title: "Populaires",
    subtitle: "Les films et séries les plus populaires",
  },
  {
    key: "attendus",
    title: "Attendus",
    subtitle: "Pas encore sortis, déjà très suivis",
  },
  {
    key: "sorties",
    title: "Sorties",
    subtitle: "Sorti récemment",
  },
];

function DiscoverSection({
  moduleKey,
  title,
  subtitle,
}: {
  moduleKey: DiscoverModuleKey;
  title: string;
  subtitle: string;
}) {
  const { data, isLoading, error } = useDiscoverModule(moduleKey);
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-lg bg-muted/50 animate-pulse"
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.map((title) => (
            <TitleCard
              key={`${moduleKey}-${title.id}`}
              title={title}
              compact
              watched={watchedTitles?.has(title.id)}
              inWatchlist={watchlistIds.has(title.id)}
              inFavorites={favoriteIds.has(title.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function DiscoverPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        <div>
          <h1 className="text-2xl font-bold">Découvrir</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tendances, populaires, attendus et dernières sorties
          </p>
        </div>

        {MODULES.map((mod) => (
          <DiscoverSection
            key={mod.key}
            moduleKey={mod.key}
            title={mod.title}
            subtitle={mod.subtitle}
          />
        ))}
      </div>
    </div>
  );
}
