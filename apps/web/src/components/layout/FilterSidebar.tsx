/**
 * Sidebar droite des filtres, déployée depuis le bouton "Filtres" du header
 * (bug #28/#34, modification O).
 * Ordre des contrôles (modification O) : Type (rejoint le panneau à
 * l'ouverture, cf. `Header.tsx`) → Statut → Année de sortie → Date de
 * visionnage (uniquement sur /history) → Note IMDB → Genre → Pays → Listes.
 */

"use client";

import { X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { MultiSelectDropdown } from "@/components/common/MultiSelectDropdown";
import { TypeFilterTabs, FilterTab } from "./TypeFilterTabs";
import {
  TitleFilters,
  WatchedStatusFilter,
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

interface ListOption {
  id: string;
  nom: string;
}

const WATCHED_STATUS_OPTIONS: { value: WatchedStatusFilter; label: string }[] = [
  { value: "tout", label: "Tout" },
  { value: "vu", label: "Vu" },
  { value: "non_vu", label: "Non vu" },
];

interface FilterSidebarProps {
  open: boolean;
  onClose: () => void;
  filters: TitleFilters;
  typeTabs: FilterTab[];
  activeType: string;
  onTypeChange: (id: string) => void;
  genres?: RefOption[];
  countries?: RefOption[];
  studios?: RefOption[];
  lists?: ListOption[];
  yearRange: [number, number];
  onYearRangeChange: (next: [number, number]) => void;
  onYearRangeCommit: (next: [number, number]) => void;
  noteRange: [number, number];
  onNoteRangeChange: (next: [number, number]) => void;
  onNoteRangeCommit: (next: [number, number]) => void;
  showWatchedDateFilter?: boolean;
  watchedYearRange?: [number, number];
  onWatchedYearRangeChange?: (next: [number, number]) => void;
  onWatchedYearRangeCommit?: (next: [number, number]) => void;
  onToggleGenre: (id: string) => void;
  onToggleCountry: (id: string) => void;
  onToggleStudio: (id: string) => void;
  onToggleList: (id: string) => void;
  onSelectAllGenres: () => void;
  onSelectAllCountries: () => void;
  onSelectAllStudios: () => void;
  onSelectAllLists: () => void;
  onWatchedStatusChange: (status: string) => void;
  onReset: () => void;
}

export function FilterSidebar({
  open,
  onClose,
  filters,
  typeTabs,
  activeType,
  onTypeChange,
  genres,
  countries,
  studios,
  lists,
  yearRange,
  onYearRangeChange,
  onYearRangeCommit,
  noteRange,
  onNoteRangeChange,
  onNoteRangeCommit,
  showWatchedDateFilter,
  watchedYearRange,
  onWatchedYearRangeChange,
  onWatchedYearRangeCommit,
  onToggleGenre,
  onToggleCountry,
  onToggleStudio,
  onToggleList,
  onSelectAllGenres,
  onSelectAllCountries,
  onSelectAllStudios,
  onSelectAllLists,
  onWatchedStatusChange,
  onReset,
}: FilterSidebarProps) {
  if (!open) return null;

  return (
    <>
      {/* Overlay : ferme le panneau au clic en dehors (au-dessus de la
          barre d'icônes du bas, cf. BottomNav z-40) */}
      <div
        className="fixed inset-0 z-[45] bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* < lg : feuille qui remonte du bas (assez peu de place pour une
          sidebar). >= lg : sidebar droite, plafonnée à 30% de la largeur
          (retour utilisateur). */}
      <aside
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] w-full overflow-y-auto rounded-t-xl border-t border-border bg-background p-4 shadow-xl lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:h-full lg:max-h-full lg:w-80 lg:max-w-[30vw] lg:rounded-t-none lg:rounded-l-xl lg:border-l lg:border-t-0"
      >
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
          {typeTabs.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <TypeFilterTabs
                tabs={typeTabs}
                active={activeType}
                onChange={onTypeChange}
                className="flex-wrap"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Statut</label>
            <div className="flex flex-wrap gap-1">
              {WATCHED_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onWatchedStatusChange(option.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    filters.watchedStatus === option.value
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

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

          {showWatchedDateFilter && watchedYearRange && onWatchedYearRangeChange && onWatchedYearRangeCommit && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Date de visionnage</span>
                <span>
                  {watchedYearRange[0]} – {watchedYearRange[1]}
                </span>
              </div>
              <Slider
                value={watchedYearRange}
                min={YEAR_RANGE_MIN}
                max={YEAR_RANGE_MAX}
                step={1}
                onValueChange={(next) => onWatchedYearRangeChange(next as [number, number])}
                onValueCommitted={(next) =>
                  onWatchedYearRangeCommit(next as [number, number])
                }
              />
            </div>
          )}

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

          <MultiSelectDropdown
            label="Genre"
            options={genres}
            selectedIds={filters.genreIds}
            onToggle={onToggleGenre}
            onSelectAll={onSelectAllGenres}
          />

          <MultiSelectDropdown
            label="Pays"
            options={countries}
            selectedIds={filters.countryIds}
            onToggle={onToggleCountry}
            onSelectAll={onSelectAllCountries}
          />

          <MultiSelectDropdown
            label="Studio"
            options={studios}
            selectedIds={filters.studioIds}
            onToggle={onToggleStudio}
            onSelectAll={onSelectAllStudios}
          />

          <MultiSelectDropdown
            label="Listes"
            options={lists}
            selectedIds={filters.listIds}
            onToggle={onToggleList}
            onSelectAll={onSelectAllLists}
          />
        </div>
      </aside>
    </>
  );
}
