/**
 * Révèle progressivement les éléments d'un tableau déjà chargé, au fur et
 * à mesure du scroll — "infinite scroll" côté client pour les pages dont
 * le backend doit renvoyer la liste complète pour d'autres raisons (ex.
 * /watchlist : `GET /lists/:id` renvoie tout, nécessaire au glisser-déposer
 * de modification S sur les listes personnalisées) et où une vraie
 * pagination serveur n'a donc pas de sens.
 */

import { useEffect, useMemo, useRef, useState } from "react";

export function useProgressiveReveal<T>(items: T[], pageSize: number = 24) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Revient à une page si la TAILLE de la liste change (nouveau filtre,
  // nouvelles données) — évite de rester bloqué sur un visibleCount obsolète.
  // Dépend de `items.length`, pas de `items` : la plupart des appelants
  // recalculent leur tableau filtré à chaque rendu (`.filter(...)` inline),
  // ce qui change sa référence sans changer son contenu — dépendre de la
  // référence réinitialiserait `visibleCount` à chaque rendu et empêcherait
  // toute révélation progressive de dépasser la première page.
  useEffect(() => {
    setVisibleCount(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + pageSize, items.length));
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, pageSize]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  return { visibleItems, hasMore, sentinelRef };
}
