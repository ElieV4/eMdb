/**
 * Slider horizontal de `DateCard` avec bouton "Voir davantage" — utilisé par
 * les modules Historique et Calendrier de l'accueil (modification J).
 * Affiche jusqu'à `initialCount` cartes, puis révèle le reste (jusqu'à
 * `maxCount`, déjà chargé) au clic sur "Voir davantage", sans requête
 * supplémentaire.
 */

"use client";

import { useState } from "react";
import { DateCard } from "./DateCard";

export type DateCardData = {
  key: string;
  href: string;
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  date?: Date | string | null;
};

type DateCardSliderProps = {
  items: DateCardData[];
  initialCount?: number;
};

export function DateCardSlider({ items, initialCount = 20 }: DateCardSliderProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialCount);
  const hasMore = !expanded && items.length > initialCount;

  return (
    <div className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {visible.map((item) => (
        <DateCard
          key={item.key}
          href={item.href}
          imageUrl={item.imageUrl}
          title={item.title}
          subtitle={item.subtitle}
          date={item.date}
        />
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 w-32 sm:w-36 aspect-[2/3] rounded-lg border border-dashed text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          Voir davantage
        </button>
      )}
    </div>
  );
}
