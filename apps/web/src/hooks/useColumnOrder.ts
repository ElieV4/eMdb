/**
 * Ordre des colonnes d'une vue tableau, modifiable par glisser-déposer des
 * en-têtes (ou par les flèches du panneau « Colonnes ») et mémorisé dans le
 * navigateur. Les colonnes absentes de l'ordre mémorisé (nouvelles
 * colonnes) se placent à la suite, dans leur ordre par défaut.
 */

"use client";

import {
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function useColumnOrder(storageKey: string, defaultIds: string[]) {
  const [saved, setSaved] = useState<string[]>([]);
  const dragged = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setSaved(raw ? JSON.parse(raw) : []);
    } catch {
      setSaved([]);
    }
  }, [storageKey]);

  const idsKey = defaultIds.join("|");
  const order = useMemo(() => {
    const ids = idsKey.split("|");
    const known = saved.filter((id) => ids.includes(id));
    return [...known, ...ids.filter((id) => !known.includes(id))];
  }, [saved, idsKey]);

  const persist = useCallback(
    (next: string[]) => {
      setSaved(next);
      try {
        if (next.length)
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        else window.localStorage.removeItem(storageKey);
      } catch {
        // stockage indisponible : ordre gardé pour la session
      }
    },
    [storageKey],
  );

  /** Place `id` à la position de `targetId`. */
  const move = (id: string, targetId: string) => {
    if (id === targetId || !order.includes(id) || !order.includes(targetId))
      return;
    const next = order.filter((c) => c !== id);
    next.splice(order.indexOf(targetId), 0, id);
    persist(next);
  };

  /** Décale `id` d'un cran parmi `ids` (colonnes affichées) : -1 à gauche, 1 à droite. */
  const shift = (id: string, delta: -1 | 1, ids: string[] = order) => {
    const arranged = arrange(ids);
    const to = arranged.indexOf(id) + delta;
    if (to < 0 || to >= arranged.length) return;
    move(id, arranged[to]);
  };

  /** Trie une liste d'ids selon l'ordre courant. */
  function arrange<T extends string>(ids: T[]): T[] {
    return [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  const reset = () => persist([]);

  /** Props d'un en-tête déplaçable par glisser-déposer. */
  const headerProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      dragged.current = id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    },
    onDragOver: (e: DragEvent) => {
      if (!dragged.current) return;
      e.preventDefault();
      if (dropTarget !== id) setDropTarget(id);
    },
    onDragLeave: () => setDropTarget((t) => (t === id ? null : t)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragged.current) move(dragged.current, id);
      dragged.current = null;
      setDropTarget(null);
    },
    onDragEnd: () => {
      dragged.current = null;
      setDropTarget(null);
    },
    title: "Glisser pour déplacer la colonne",
    "data-drop-target": dropTarget === id ? "true" : undefined,
  });

  return {
    order,
    move,
    shift,
    arrange,
    reset,
    headerProps,
    isCustom: saved.length > 0,
  };
}
