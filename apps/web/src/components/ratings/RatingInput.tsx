/**
 * Input de notation par étoiles — 5 étoiles, chacune divisée en deux zones
 * cliquables (moitié gauche/droite) pour choisir une valeur entière de 1 à
 * 10 : l'échelle stockée (`note_perso NUMERIC(3,1) BETWEEN 0 AND 10`) ne
 * change pas, seul le rendu passe de 10 étoiles pleines à 5 étoiles avec
 * demi-teintes (retour utilisateur — remplace les 10 étoiles précédentes,
 * dont chaque clic ne pouvait de toute façon jamais tomber sur une valeur
 * entière, cf. git blame).
 *
 * Phase 4.2 — Ratings
 */

"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingInputProps = {
  value?: number | null;
  onChange: (value: number) => void;
  /** "sm" : étoiles réduites (contexte compact, ex. sous l'affiche du TitleHero). */
  size?: "default" | "sm";
  className?: string;
};

export function RatingInput({ value, onChange, size = "default", className }: RatingInputProps) {
  const [hover, setHover] = useState<number | null>(null);

  const rating = hover ?? value ?? 0;
  const compact = size === "sm";
  const starSizeClass = compact ? "h-5 w-5" : "h-7 w-7";

  const handleMouseLeave = () => setHover(null);

  return (
    <div
      className={cn("flex items-center", compact ? "gap-0.5" : "gap-1", className)}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        // Étoile i (0-4) : moitié gauche = valeur impaire, moitié droite =
        // valeur paire — 5 étoiles × 2 zones = les 10 valeurs entières
        // possibles sur l'échelle /10.
        const halfValue = i * 2 + 1;
        const fullValue = i * 2 + 2;
        const filled = rating >= fullValue;
        const halfFilled = !filled && rating >= halfValue;

        return (
          <div key={i} className={cn("relative", starSizeClass)}>
            <Star
              className={cn(
                starSizeClass,
                "pointer-events-none transition-colors",
                filled
                  ? "fill-yellow-400 text-yellow-400"
                  : halfFilled
                    ? "fill-yellow-400/50 text-yellow-400"
                    : "text-gray-300",
              )}
            />
            <button
              type="button"
              aria-label={`Noter ${halfValue}/10`}
              className="absolute inset-y-0 left-0 w-1/2 cursor-pointer bg-transparent p-0"
              onClick={() => onChange(halfValue)}
              onMouseEnter={() => setHover(halfValue)}
            />
            <button
              type="button"
              aria-label={`Noter ${fullValue}/10`}
              className="absolute inset-y-0 right-0 w-1/2 cursor-pointer bg-transparent p-0"
              onClick={() => onChange(fullValue)}
              onMouseEnter={() => setHover(fullValue)}
            />
          </div>
        );
      })}
      <span className={cn("text-muted-foreground", compact ? "ml-1 text-xs" : "ml-2 text-sm")}>
        {value !== undefined && value !== null ? `${value}/10` : ""}
      </span>
    </div>
  );
}
