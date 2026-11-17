/**
 * Page dédiée d'un module "Découvrir" (Tendances/Populaires/Attendus/Sorties)
 * — modification N : chaque module de premier niveau a désormais sa propre
 * page où le résultat s'affiche en grille (plusieurs lignes), cible du
 * "Voir davantage" de l'aperçu `/discover`.
 */

"use client";

import { notFound } from "next/navigation";
import { DiscoverModuleSection, DISCOVER_MODULES } from "@/components/discover/DiscoverModuleSection";

export default function DiscoverModulePage({ params }: { params: { module: string } }) {
  const mod = DISCOVER_MODULES.find((m) => m.key === params.module);
  if (!mod) notFound();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <DiscoverModuleSection
        moduleKey={mod.key}
        title={mod.title}
        subtitle={mod.subtitle}
        variant="grid"
      />
    </div>
  );
}
