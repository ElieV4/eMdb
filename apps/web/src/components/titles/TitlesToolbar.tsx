/**
 * Barre d'outils commune des pages qui listent des titres (listes,
 * watchlist, historique, recommandés, Découvrir...) :
 * - à gauche : recherche sur tous les champs ;
 * - à droite, sur la même ligne : choix de vue (affiches / tableau), bouton
 *   crayon (configurer la liste, modifier le contenu) puis, en vue tableau,
 *   « Trier / filtrer » et « Colonnes ».
 * Boutons ronds, icône seule, libellé au survol.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Columns3, ListFilter, Search, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewModeToggle } from "@/components/titles/ViewModeToggle";
import { ViewMode } from "@/hooks/useViewMode";
import { cn } from "@/lib/utils";

export function ToolbarIconButton({
  label,
  icon,
  onClick,
  pressed,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-pressed={pressed}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
              pressed
                ? "border-primary bg-primary text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {icon}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type TitlesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  affichesLabel?: string;
  /** Bouton crayon (EditMenuButton) ou autres actions propres à la page. */
  actions?: ReactNode;
  /** Vue tableau : boutons « Trier / filtrer » et « Colonnes ». */
  tableControls?: {
    filtersOpen: boolean;
    onToggleFilters: () => void;
    columnsOpen: boolean;
    onToggleColumns: () => void;
  };
  className?: string;
};

export function TitlesToolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  affichesLabel,
  actions,
  tableControls,
  className,
}: TitlesToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(search.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {searchOpen ? (
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onSearchChange("");
                setSearchOpen(false);
              }
            }}
            placeholder="Rechercher (titre, réalisation, année…)"
            aria-label="Rechercher dans la page"
            className="h-9 w-full rounded-full border bg-transparent pl-8 pr-8 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            aria-label="Fermer la recherche"
            onClick={() => {
              onSearchChange("");
              setSearchOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <ToolbarIconButton label="Rechercher" icon={<Search className="h-4 w-4" />} onClick={() => setSearchOpen(true)} />
      )}

      <div className="ml-auto flex items-center gap-2">
        {viewMode && onViewModeChange && (
          <ViewModeToggle mode={viewMode} onChange={onViewModeChange} affichesLabel={affichesLabel} />
        )}
        {actions}
        {tableControls && (
          <>
            <ToolbarIconButton
              label="Trier / filtrer"
              icon={<ListFilter className="h-4 w-4" />}
              onClick={tableControls.onToggleFilters}
              pressed={tableControls.filtersOpen}
            />
            <ToolbarIconButton
              label="Colonnes"
              icon={<Columns3 className="h-4 w-4" />}
              onClick={tableControls.onToggleColumns}
              pressed={tableControls.columnsOpen}
            />
          </>
        )}
      </div>
    </div>
  );
}
