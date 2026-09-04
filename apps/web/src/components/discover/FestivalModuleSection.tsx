/**
 * Section "Sélection" de la page Découvrir : éditions récentes de festivals
 * de cinéma / cérémonies (Cannes, Berlinale, Golden Globes...), même schéma
 * "row + Voir davantage" que `DiscoverModuleSection`.
 */

"use client";

import { CardSlider } from "@/components/common/CardSlider";
import { FestivalEditionCard } from "./FestivalEditionCard";
import { useFestivalEditions } from "@/hooks/api/useDiscoverFestivals";

const ROW_PREVIEW_COUNT = 10;

export function FestivalModuleSection({ variant = "row" }: { variant?: "row" | "grid" }) {
  const { data, isLoading, error } = useFestivalEditions();
  const editions = data ?? [];
  const visible = variant === "row" ? editions.slice(0, ROW_PREVIEW_COUNT) : editions;
  const hasMore = variant === "row" && editions.length > ROW_PREVIEW_COUNT;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Sélection</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Festivals et cérémonies récents — catégories, nommés et gagnants
        </p>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[150px] aspect-[2/3] rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground py-4">Erreur lors du chargement de ce module.</p>
      ) : editions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Aucune édition récente à afficher pour le moment.</p>
      ) : variant === "row" ? (
        <CardSlider moreHref={hasMore ? "/discover/festivals" : undefined}>
          {visible.map((edition) => (
            <FestivalEditionCard key={edition.editionId} edition={edition} />
          ))}
        </CardSlider>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {visible.map((edition) => (
            <FestivalEditionCard key={edition.editionId} edition={edition} />
          ))}
        </div>
      )}
    </section>
  );
}
