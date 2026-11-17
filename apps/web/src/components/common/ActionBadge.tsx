/**
 * Style « badge » des valeurs modifiables d'une vue tableau (note, listes,
 * commentaire, contexte...) : pastille arrondie, bordure qui s'allume au
 * survol, pointillés quand la valeur est vide — pour signaler qu'un clic
 * permet d'agir.
 */

import { cn } from "@/lib/utils";

export function actionBadgeClass(empty = false, className?: string) {
  return cn(
    "inline-flex max-w-[14rem] items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
    "hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-60",
    empty
      ? "border-dashed text-muted-foreground"
      : "bg-muted/40 text-foreground",
    className,
  );
}
