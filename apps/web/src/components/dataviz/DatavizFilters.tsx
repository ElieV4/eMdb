/**
 * Filtres de la section Dataviz (Phase 6).
 * - Sélecteur de groupement : période | genre | pays | animation
 * - Filtres année : yearFrom, yearTo
 */

"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { DatavizGroupBy } from "@/lib/dataviz/types";

const GROUP_BY_OPTIONS: { value: DatavizGroupBy; label: string }[] = [
  { value: "period", label: "Période" },
  { value: "genre", label: "Genre" },
  { value: "country", label: "Pays" },
  { value: "animation", label: "Animation" },
];

type DatavizFiltersProps = {
  groupBy: DatavizGroupBy;
  yearFrom?: number;
  yearTo?: number;
  onGroupByChange: (groupBy: DatavizGroupBy) => void;
  onYearFromChange: (year: number | undefined) => void;
  onYearToChange: (year: number | undefined) => void;
};

export function DatavizFilters({
  groupBy,
  yearFrom,
  yearTo,
  onGroupByChange,
  onYearFromChange,
  onYearToChange,
}: DatavizFiltersProps) {
  const [yearFromInput, setYearFromInput] = useState(
    yearFrom !== undefined ? String(yearFrom) : "",
  );
  const [yearToInput, setYearToInput] = useState(
    yearTo !== undefined ? String(yearTo) : "",
  );

  function handleYearFromChange(value: string) {
    setYearFromInput(value);
    const parsed = parseInt(value, 10);
    onYearFromChange(Number.isFinite(parsed) ? parsed : undefined);
  }

  function handleYearToChange(value: string) {
    setYearToInput(value);
    const parsed = parseInt(value, 10);
    onYearToChange(Number.isFinite(parsed) ? parsed : undefined);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Groupement</Label>
        <div className="flex flex-wrap gap-1 rounded-lg border p-1">
          {GROUP_BY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onGroupByChange(option.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                groupBy === option.value
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="space-y-2">
          <Label
            htmlFor="dataviz-year-from"
            className="text-xs text-muted-foreground"
          >
            Année de
          </Label>
          <Input
            id="dataviz-year-from"
            type="number"
            min={1900}
            max={2100}
            placeholder="2000"
            value={yearFromInput}
            onChange={(e) => handleYearFromChange(e.target.value)}
            className="w-28"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="dataviz-year-to"
            className="text-xs text-muted-foreground"
          >
            Année à
          </Label>
          <Input
            id="dataviz-year-to"
            type="number"
            min={1900}
            max={2100}
            placeholder="2026"
            value={yearToInput}
            onChange={(e) => handleYearToChange(e.target.value)}
            className="w-28"
          />
        </div>
      </div>
    </div>
  );
}
