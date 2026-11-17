/**
 * Affichage progressif des vues tableau : les 100 premières lignes d'abord,
 * puis 100 de plus chaque fois que le bas du tableau devient visible
 * (sentinelle observée). Revient à 100 quand `resetKey` change (recherche,
 * filtres, tri).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const PAGE_ROWS = 100;

export function useProgressiveRows(total: number, resetKey: unknown) {
  const [limit, setLimit] = useState(PAGE_ROWS);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setLimit(PAGE_ROWS);
  }, [resetKey]);

  const hasMore = limit < total;

  // Ref callback : (re)branche l'observateur sur la sentinelle rendue en bas du tableau.
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || !hasMore || typeof IntersectionObserver === "undefined")
        return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting))
            setLimit((l) => l + PAGE_ROWS);
        },
        { rootMargin: "400px" },
      );
      observerRef.current.observe(node);
    },
    [hasMore],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return {
    limit,
    hasMore,
    sentinelRef,
    showMore: () => setLimit((l) => l + PAGE_ROWS),
  };
}
