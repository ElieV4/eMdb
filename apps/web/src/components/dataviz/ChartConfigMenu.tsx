/**
 * Bouton "⋮" + panneau de configuration flottant, partagé par tous les
 * graphiques et cartes dataviz configurables — modification W.
 *
 * Rendu via un Portal vers `document.body` (positionné en `fixed` à partir
 * du `getBoundingClientRect()` du bouton) plutôt qu'un simple `position:
 * absolute` local : les cartes (`Card`, `overflow-hidden` pour les coins
 * arrondis) rognaient le panneau à leurs propres bords, le rendant
 * partiellement inaccessible (retour utilisateur) — un `overflow: hidden`
 * sur un ancêtre coupe tout descendant `absolute`, quel que soit son
 * z-index. Le Portal échappe complètement à cet ancêtre, même principe que
 * `MenuPrimitive.Portal` déjà utilisé par les `DropdownMenu` Base UI de
 * l'app.
 */

"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export function ChartConfigMenu({
  label,
  width = "w-72",
  children,
}: {
  label: string;
  width?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.right });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={`Configurer "${label}"`}
        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open &&
        position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              className={`fixed z-50 ${width} max-h-[33vh] space-y-3 overflow-y-auto rounded-lg border bg-popover p-3 shadow-lg`}
              style={{ top: position.top, left: position.left, transform: "translateX(-100%)" }}
            >
              {children}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
