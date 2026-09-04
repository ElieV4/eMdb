/**
 * Page dédiée du module "Sélection" — grille de toutes les éditions
 * récentes de festivals/cérémonies, cible du "Voir davantage" de l'aperçu
 * `/discover` (même schéma que /discover/[module]).
 */

"use client";

import { FestivalModuleSection } from "@/components/discover/FestivalModuleSection";

export default function DiscoverFestivalsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <FestivalModuleSection variant="grid" />
    </div>
  );
}
