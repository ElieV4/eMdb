/**
 * Ligne horizontale scrollable (une seule rangée, pas de retour à la ligne)
 * avec une carte "Voir davantage" en fin de rangée qui mène vers la page
 * dédiée où le même contenu peut s'afficher sur plusieurs lignes
 * (modification N, retour utilisateur : tous les modules des pages de
 * premier niveau — Accueil, Découvrir — suivent ce même schéma).
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

type CardSliderProps = {
  children: React.ReactNode;
  moreHref?: string;
  moreLabel?: string;
  className?: string;
};

export function CardSlider({
  children,
  moreHref,
  moreLabel = "Voir davantage",
  className,
}: CardSliderProps) {
  return (
    <div className={cn("flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-hide", className)}>
      {children}
      {moreHref && (
        <Link
          href={moreHref}
          className="shrink-0 w-32 sm:w-36 aspect-[2/3] rounded-lg border border-dashed flex items-center justify-center px-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {moreLabel}
        </Link>
      )}
    </div>
  );
}
