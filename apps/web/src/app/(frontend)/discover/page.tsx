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
 * Modification N : chaque module s'affiche ici en une seule ligne
 * scrollable, avec un "Voir davantage" vers sa page dédiée
 * (/discover/[module]) où il peut s'étaler sur plusieurs lignes.
 */

"use client";

import { DiscoverModuleSection, DISCOVER_MODULES } from "@/components/discover/DiscoverModuleSection";

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

        {DISCOVER_MODULES.map((mod) => (
          <DiscoverModuleSection
            key={mod.key}
            moduleKey={mod.key}
            title={mod.title}
            subtitle={mod.subtitle}
            variant="row"
            moreHref={`/discover/${mod.key}`}
          />
        ))}
      </div>
    </div>
  );
}
