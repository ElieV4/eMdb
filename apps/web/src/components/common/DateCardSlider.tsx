/**
 * Slider horizontal de `DateCard` avec carte "Voir davantage" — utilisé par
 * les modules Historique et Calendrier de l'accueil (modification J, puis
 * modification N : le "Voir davantage" mène désormais vers la page dédiée
 * (/history, /calendar) plutôt que de simplement révéler plus de cartes
 * sur place, pour rester cohérent avec les autres modules de l'accueil).
 */

import { DateCard } from "./DateCard";
import { CardSlider } from "./CardSlider";

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
  previewCount?: number;
  moreHref?: string;
  moreLabel?: string;
};

export function DateCardSlider({
  items,
  previewCount = 10,
  moreHref,
  moreLabel,
}: DateCardSliderProps) {
  const visible = items.slice(0, previewCount);
  const hasMore = items.length > previewCount;

  return (
    <CardSlider moreHref={hasMore ? moreHref : undefined} moreLabel={moreLabel}>
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
    </CardSlider>
  );
}
