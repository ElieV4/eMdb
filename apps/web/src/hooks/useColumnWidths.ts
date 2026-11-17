/**
 * Largeur des colonnes d'une vue tableau : poignée sur le bord droit de
 * chaque en-tête, à glisser pour élargir ou rétrécir (double-clic : largeur
 * automatique). Mémorisée dans le navigateur.
 */

"use client";

import {
  CSSProperties,
  PointerEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

const MIN_WIDTH = 40;

export function useColumnWidths(storageKey: string) {
  const [widths, setWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setWidths(raw ? JSON.parse(raw) : {});
    } catch {
      setWidths({});
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Record<string, number>) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // stockage indisponible : largeurs gardées pour la session
      }
    },
    [storageKey],
  );

  const setWidth = (id: string, width: number | null) =>
    setWidths((current) => {
      const next = { ...current };
      if (width === null) delete next[id];
      else next[id] = Math.max(MIN_WIDTH, Math.round(width));
      persist(next);
      return next;
    });

  /** Style d'un en-tête ou d'une cellule (rien si largeur automatique). */
  const styleOf = (id: string): CSSProperties | undefined => {
    const w = widths[id];
    return w
      ? { width: w, minWidth: w, maxWidth: w, overflow: "hidden" }
      : undefined;
  };

  /** Props de la poignée de redimensionnement d'un en-tête. */
  const handleProps = (id: string, label: string) => ({
    role: "separator" as const,
    "aria-orientation": "vertical" as const,
    "aria-label": `Redimensionner la colonne ${label}`,
    title: "Glisser pour redimensionner (double-clic : largeur automatique)",
    tabIndex: 0,
    draggable: false,
    onDragStart: (e: {
      preventDefault: () => void;
      stopPropagation: () => void;
    }) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const th = e.currentTarget.closest("th");
      if (!th) return;
      const startX = e.clientX;
      const startWidth = th.getBoundingClientRect().width;
      const onMove = (ev: globalThis.PointerEvent) =>
        setWidth(id, startWidth + ev.clientX - startX);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    onKeyDown: (e: {
      key: string;
      preventDefault: () => void;
      currentTarget: HTMLElement;
    }) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const th = e.currentTarget.closest("th");
      const current = widths[id] ?? th?.getBoundingClientRect().width ?? 120;
      setWidth(id, current + (e.key === "ArrowRight" ? 16 : -16));
    },
    onDoubleClick: () => setWidth(id, null),
    className:
      "absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize select-none touch-none after:absolute after:inset-y-1 after:left-1/2 after:w-px after:bg-border hover:after:bg-primary focus-visible:outline-none focus-visible:after:bg-primary",
  });

  return { widths, styleOf, handleProps, setWidth };
}
