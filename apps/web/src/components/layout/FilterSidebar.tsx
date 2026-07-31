/**
 * Sidebar droite des filtres (année, note IMDB, genre, pays), déployée
 * depuis le bouton "Filtres" du header (bug #28/#34).
 */

"use client";

import { ChevronDown, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  TitleFilters,
  hasActiveTitleFilters,
  YEAR_RANGE_MIN,
  YEAR_RANGE_MAX,
  NOTE_IMDB_MIN,
  NOTE_IMDB_MAX,
} from "@/lib/titleFilters";

interface RefOption {
  id: string;
  nom: string;
}

interface FilterSidebarProps {
  open: boolean;
  onClose: () => void;
  filters: TitleFilters;
  genres?: RefOption[];
  countries?: RefOption[];
  yearRange: [number, number];
  onYearRangeChange: (next: [number, number]) => void;
  onYearRangeCommit: (next: [number, number]) => void;
  noteRange: [number, number];
  onNoteRangeChange: (next: [number, number]) => void;
  onNoteRangeCommit: (next: [number, number]) => void;
  onToggleGenre: (id: string) => void;
  onToggleCountry: (id: string) => void;
  onReset: () => void;
}

export function FilterSidebar({
  open,
  onClose,
  filters,
  genres,
  countries,
  yearRange,
  onYearRangeChange,
  onYearRangeCommit,
  noteRange,
  onNoteRangeChange,
  onNoteRangeCommit,
  onToggleGenre,
  onToggleCountry,
  onReset,
}: FilterSidebarProps) {
  if (!open) return null;

  return (
    <>
      {/* Overlay : ferme la sidebar au clic en dehors */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] overflow-y-auto border-l border-border bg-background p-4 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold">Filtres</h2>
          <div className="flex items-center gap-3">
            {hasActiveTitleFilters(filters) && (
              <button
                onClick={onReset}
                className="text-xs text-primary hover:underline"
              >
                Réinitialiser
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fermer les filtres"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Année de sortie</span>
              <span>
                {yearRange[0]} – {yearRange[1]}
              </span>
            </div>
            <Slider
              value={yearRange}
              min={YEAR_RANGE_MIN}
              max={YEAR_RANGE_MAX}
              step={1}
              onValueChange={(next) => onYearRangeChange(next as [number, number])}
              onValueCommitted={(next) =>
                onYearRangeCommit(next as [number, number])
              }
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Note IMDB</span>
              <span>
                {noteRange[0].toFixed(1)} – {noteRange[1].toFixed(1)}
              </span>
            </div>
            <Slider
              value={noteRange}
              min={NOTE_IMDB_MIN}
              max={NOTE_IMDB_MAX}
              step={0.5}
              onValueChange={(next) => onNoteRangeChange(next as [number, number])}
              onValueCommitted={(next) =>
                onNoteRangeCommit(next as [number, number])
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Genre</label>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted">
                <span>
                  {filters.genreIds.length > 0
                    ? `${filters.genreIds.length} sélectionné${filters.genreIds.length > 1 ? "s" : ""}`
                    : "Tous"}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-72 w-64 overflow-y-auto"
              >
                {genres?.map((genre) => (
                  <DropdownMenuCheckboxItem
                    key={genre.id}
                    checked={filters.genreIds.includes(genre.id)}
                    onCheckedChange={() => onToggleGenre(genre.id)}
                  >
                    {genre.nom}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Région (pays)
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted">
                <span>
                  {filters.countryIds.length > 0
                    ? `${filters.countryIds.length} sélectionné${filters.countryIds.length > 1 ? "s" : ""}`
                    : "Tous"}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-72 w-64 overflow-y-auto"
              >
                {countries?.map((country) => (
                  <DropdownMenuCheckboxItem
                    key={country.id}
                    checked={filters.countryIds.includes(country.id)}
                    onCheckedChange={() => onToggleCountry(country.id)}
                  >
                    {country.nom}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
}
