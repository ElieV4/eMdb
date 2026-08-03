/**
 * Dropdown multi-sélection "cherchable" — variante de `MultiSelectDropdown`
 * pour les filtres dont la liste complète serait trop volumineuse à charger
 * d'un coup (Titre/Acteur/Réalisateur/Studio, module dataviz) : à
 * l'ouverture (et champ de recherche vide), affiche les 20 entités les plus
 * regardées par l'utilisateur ; taper dans le champ interroge une recherche
 * scopée à ce que l'utilisateur a déjà regardé (jamais tout le catalogue).
 *
 * `useOptions` est injecté plutôt qu'un simple tableau `options` (à la
 * différence de `MultiSelectDropdown`) car la liste dépend de la requête en
 * cours — un hook par filtre (`useDatavizTitleOptions`, etc.).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { DatavizFilterOption } from "@/hooks/api/useDatavizFilterOptions";

type SearchableMultiSelectDropdownProps = {
  label: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
  useOptions: (q: string) => { data?: DatavizFilterOption[]; isLoading: boolean };
};

export function SearchableMultiSelectDropdown({
  label,
  selectedIds,
  onToggle,
  useOptions,
}: SearchableMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Conserve le libellé de chaque id déjà rencontré (top 20 ou recherche) —
  // pour qu'un élément sélectionné reste affiché même s'il sort ensuite du
  // "top 20" ou des résultats de recherche courants.
  const labelCacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  // Ne récupère les options qu'une fois le menu ouvert — inutile de charger
  // le "top 20" de chaque filtre de chaque widget tant qu'il n'est pas
  // consulté.
  const { data: options, isLoading } = useOptions(open ? debouncedQuery : "");

  useEffect(() => {
    for (const option of options ?? []) {
      labelCacheRef.current.set(option.id, option.nom);
    }
  }, [options]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      // Le menu gère son propre focus à l'ouverture (1er item) — reprend le
      // focus sur le champ de recherche juste après.
      const timeout = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const resultIds = new Set((options ?? []).map((o) => o.id));
  const selectedNotInResults = selectedIds
    .filter((id) => !resultIds.has(id))
    .map((id) => ({ id, nom: labelCacheRef.current.get(id) ?? id }));
  const displayOptions = [...selectedNotInResults, ...(options ?? [])];

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted">
          <span>
            {selectedIds.length > 0
              ? `${selectedIds.length} sélectionné${selectedIds.length > 1 ? "s" : ""}`
              : "Tous"}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-0">
          <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Rechercher..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Chargement…</div>
            ) : displayOptions.length > 0 ? (
              displayOptions.map((option) => (
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
                {debouncedQuery ? "Aucun résultat." : "Rien à afficher pour l'instant."}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
