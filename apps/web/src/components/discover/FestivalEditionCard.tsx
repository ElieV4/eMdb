/**
 * Carte d'une édition de festival/cérémonie (module "Sélection" de
 * Découvrir) — même gabarit (aspect 2/3) que les cartes de titre pour
 * s'aligner visuellement avec les autres modules, mais sans affiche (pas de
 * poster pertinent pour un festival) : nom + année + type mis en avant.
 */

import Link from "next/link";
import { Trophy, Film } from "lucide-react";
import { FestivalEdition } from "@/hooks/api/useDiscoverFestivals";
import { cn } from "@/lib/utils";

export function FestivalEditionCard({
  edition,
  className,
}: {
  edition: FestivalEdition;
  className?: string;
}) {
  const Icon = edition.kind === "awards" ? Trophy : Film;

  return (
    <Link
      href={`/discover/festivals/${encodeURIComponent(edition.editionId)}`}
      className={cn(
        "shrink-0 w-[150px] rounded-lg border overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="aspect-[2/3] bg-muted/50 flex flex-col items-center justify-center gap-2 px-3 text-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <span className="text-2xl font-bold text-muted-foreground">{edition.annee}</span>
      </div>
      <div className="bg-background p-3">
        <h3 className="text-sm font-medium line-clamp-2" title={edition.sourceNom}>
          {edition.sourceNom}
        </h3>
      </div>
    </Link>
  );
}
