/**
 * Dropdown multi-sélection générique avec un item "Tout sélectionner" en
 * tête — permet ensuite d'exclure des valeurs facilement en décochant
 * depuis un état complet plutôt que de partir d'une sélection vide
 * (modification O, extrait de `FilterSidebar.tsx` pour être réutilisé par
 * les filtres du module dataviz — modification W).
 * Sémantique : liste vide sélectionnée = "Tous" (pas de filtre actif).
 */

"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface MultiSelectOption {
  id: string;
  nom: string;
}

export function MultiSelectDropdown({
  label,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
}: {
  label: string;
  options: MultiSelectOption[] | undefined;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted">
          <span>
            {selectedIds.length > 0
              ? `${selectedIds.length} sélectionné${selectedIds.length > 1 ? "s" : ""}`
              : "Tous"}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
          <DropdownMenuItem
            onClick={onSelectAll}
            disabled={!options || options.length === 0}
          >
            Tout sélectionner
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {options && options.length > 0 ? (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                checked={selectedIds.includes(option.id)}
                onCheckedChange={() => onToggle(option.id)}
              >
                {option.nom}
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Aucune option
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
