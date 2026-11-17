/**
 * Page détail d'une édition de festival/cérémonie (module "Sélection") :
 * catégories, nommés et gagnants, filtrables. Chargée "à la demande" au
 * clic sur une édition (`useFestivalSelection`, `enabled` seulement ici).
 */

"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { TitleCard } from "@/components/titles/TitleCard";
import {
  useFestivalEditions,
  useFestivalSelection,
  FestivalNominee,
} from "@/hooks/api/useDiscoverFestivals";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { cn } from "@/lib/utils";

const SANS_CATEGORIE = "Sélection officielle";

function NomineeCard({ nominee }: { nominee: FestivalNominee }) {
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  return (
    <div className="relative">
      {nominee.gagnant && (
        <span
          className="absolute top-2 left-2 z-30 flex items-center gap-1 rounded-full bg-amber-500 text-white text-xs font-medium px-2 py-0.5 shadow"
          title="Gagnant"
        >
          <Trophy className="h-3 w-3" />
          Gagnant
        </span>
      )}
      <TitleCard
        title={nominee}
        compact
        watched={watchedTitles?.has(nominee.id)}
        inWatchlist={watchlistIds.has(nominee.id)}
        inFavorites={favoriteIds.has(nominee.id)}
      />
    </div>
  );
}

export default function FestivalEditionPage({ params }: { params: { editionId: string } }) {
  const { editionId } = params;
  const { data: editions } = useFestivalEditions();
  const { data: nominees, isLoading, error } = useFestivalSelection(editionId);

  const edition = editions?.find((e) => e.editionId === editionId);

  const [categorie, setCategorie] = useState<string | null>(null);
  const [gagnantsUniquement, setGagnantsUniquement] = useState(false);

  const categories = useMemo(() => {
    const set = new Set((nominees ?? []).map((n) => n.categorie ?? SANS_CATEGORIE));
    return [...set].sort((a, b) => {
      // "Sélection officielle" (pas de catégorie précise) en dernier.
      if (a === SANS_CATEGORIE) return 1;
      if (b === SANS_CATEGORIE) return -1;
      return a.localeCompare(b);
    });
  }, [nominees]);

  const filtered = (nominees ?? []).filter((n) => {
    if (gagnantsUniquement && !n.gagnant) return false;
    if (categorie && (n.categorie ?? SANS_CATEGORIE) !== categorie) return false;
    return true;
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{edition?.sourceNom ?? "Sélection"}</h1>
        {edition && <p className="text-sm text-muted-foreground mt-1">{edition.editionLabel}</p>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground py-4">Erreur lors du chargement de cette sélection.</p>
      ) : !nominees || nominees.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Sélection pas encore disponible pour cette édition.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setCategorie(null)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full border transition-colors",
                categorie === null ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
              )}
            >
              Toutes catégories
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full border transition-colors",
                  categorie === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setGagnantsUniquement((v) => !v)}
              className={cn(
                "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors",
                gagnantsUniquement
                  ? "bg-amber-500 text-white border-amber-500"
                  : "hover:bg-muted",
              )}
            >
              <Trophy className="h-3.5 w-3.5" />
              Gagnants uniquement
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucun titre ne correspond aux filtres actifs.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filtered.map((nominee, i) => (
                <NomineeCard key={`${nominee.id}-${nominee.categorie ?? "none"}-${i}`} nominee={nominee} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
