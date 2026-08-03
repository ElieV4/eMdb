/**
 * Menu de configuration unifié, identique pour les 8 visuels dataviz —
 * modification W, 8ème passe. Structure demandée :
 * - Métrique (single select) → révèle l'Agrégation (single select, options
 *   dépendantes de la métrique).
 * - Groupement (single select) — restreint à Tout/Période quand
 *   l'agrégation choisie est min/max/avg/évolution pour les métriques
 *   Visionnages/Titres (pas de sens par genre/pays/studio/type de média).
 * - Légende (single select, barcharts/linechart uniquement — `showLegend`)
 *   — même liste de groupements que "Groupement" (sans le groupement déjà
 *   choisi comme axe principal), divise chaque barre en plusieurs séries
 *   ou trace plusieurs lignes. Masquée quand l'agrégation ne le permet pas
 *   (`supportsLegend`, même restriction que "Groupement" plus evolution/
 *   note+avg — cf. `DatavizService.queryRows` côté backend).
 * - Filtres : Type de média (single select), Année de visionnage/Année de
 *   sortie/Note (slicers), Genre/Pays/Studio/Listes (dropdowns, 2 par ligne).
 */

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { MultiSelectDropdown } from "@/components/common/MultiSelectDropdown";
import { SearchableMultiSelectDropdown } from "./SearchableMultiSelectDropdown";
import {
  useTitleGenres,
  useTitleCountries,
  useLists,
  useDatavizTitleOptions,
  useDatavizActorOptions,
  useDatavizDirectorOptions,
  useDatavizStudioOptions,
} from "@/hooks/api";
import { useAuthStore } from "@/store/authStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { YEAR_RANGE_MIN, YEAR_RANGE_MAX, NOTE_IMDB_MIN, NOTE_IMDB_MAX } from "@/lib/titleFilters";
import { AGGREGATION_LABEL } from "@/lib/dataviz/transformers";
import {
  ALLOWED_AGGREGATIONS,
  isGroupByRestricted,
  isTop20GroupByAllowed,
  supportsLegend,
  DatavizAggregation,
  DatavizGranularity,
  DatavizGroupBy,
  DatavizMediaType,
  DatavizMetric,
  DatavizVisualConfig,
} from "@/lib/dataviz/types";

export const METRIC_OPTIONS: { value: DatavizMetric; label: string }[] = [
  { value: "duration", label: "Durée" },
  { value: "watches", label: "Visionnages" },
  { value: "titles", label: "Titres" },
  { value: "note", label: "Note" },
];

const GROUP_BY_OPTIONS: { value: DatavizGroupBy; label: string }[] = [
  { value: "none", label: "Tout" },
  { value: "mediaType", label: "Type de média" },
  { value: "period", label: "Période" },
  { value: "genre", label: "Genre" },
  { value: "country", label: "Pays" },
  { value: "studio", label: "Studio" },
  { value: "title", label: "Titre (top 20)" },
  { value: "actor", label: "Acteur (top 20)" },
  { value: "director", label: "Réalisateur (top 20)" },
];

const RESTRICTED_GROUP_BY_OPTIONS = GROUP_BY_OPTIONS.filter((o) => o.value === "none" || o.value === "period");

const TOP20_GROUP_BY_VALUES: DatavizGroupBy[] = ["title", "actor", "director"];

// "Légende" : mêmes groupements, mais "none" se lit "Aucune" (pas "Tout") —
// jamais les groupements "top 20" (titre/acteur/réalisateur, hors scope
// comme axe secondaire, cf. `DatavizQueryDto.legendBy`).
const LEGEND_BASE_OPTIONS: { value: DatavizGroupBy; label: string }[] = [
  { value: "none", label: "Aucune" },
  ...GROUP_BY_OPTIONS.filter((o) => o.value !== "none" && !TOP20_GROUP_BY_VALUES.includes(o.value)),
];

const MEDIA_TYPE_FILTER_OPTIONS: { value: "tout" | DatavizMediaType; label: string }[] = [
  { value: "tout", label: "Tout" },
  { value: "film", label: "Film" },
  { value: "serie", label: "Série" },
];

// "Période" se décline en deux familles : Fixe (chronologique) et Agrégée
// (cyclique, toutes années confondues — ex. "tous les lundis").
const PERIOD_MODE_OPTIONS: { value: "fixed" | "aggregated"; label: string }[] = [
  { value: "fixed", label: "Fixe" },
  { value: "aggregated", label: "Agrégée" },
];

const FIXED_GRANULARITY_OPTIONS: { value: DatavizGranularity; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Année" },
];

const AGGREGATED_GRANULARITY_OPTIONS: { value: DatavizGranularity; label: string }[] = [
  { value: "hour", label: "Heure" },
  { value: "dayQuarter", label: "Quart de journée" },
  { value: "weekday", label: "Jour de la semaine" },
  { value: "monthOfYear", label: "Mois de l'année" },
  { value: "season", label: "Saison" },
];

export const AGGREGATED_GRANULARITIES = new Set<DatavizGranularity>([
  "hour",
  "dayQuarter",
  "weekday",
  "monthOfYear",
  "season",
]);

export function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function RangeSlider({
  label,
  range,
  min,
  max,
  step,
  format,
  onChange,
  onCommit,
}: {
  label: string;
  range: [number, number];
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  onChange: (next: [number, number]) => void;
  onCommit: (next: [number, number]) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {format(range[0])} – {format(range[1])}
        </span>
      </div>
      <Slider
        value={range}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next as [number, number])}
        onValueCommitted={(next) => onCommit(next as [number, number])}
      />
    </div>
  );
}

export function DatavizVisualConfigFields({
  config,
  updateConfig,
  showLegend = false,
  enableTop20 = true,
}: {
  config: DatavizVisualConfig;
  updateConfig: (patch: Partial<DatavizVisualConfig>) => void;
  /** N'affiche le contrôle "Légende" que pour les barcharts/linechart. */
  showLegend?: boolean;
  /** Groupements "top 20" (titre/acteur/réalisateur) — une seule valeur n'a
   * pas de sens pour un classement, donc masqués sur les cartes (`DatavizMetricCard`). */
  enableTop20?: boolean;
}) {
  const { isAuthenticated } = useAuthStore();
  const { data: genres } = useTitleGenres();
  const { data: countries } = useTitleCountries();
  const { data: lists } = useLists(isAuthenticated);

  const [watchedYearRange, setWatchedYearRange] = useState<[number, number]>([
    config.watchedYearMin ?? YEAR_RANGE_MIN,
    config.watchedYearMax ?? YEAR_RANGE_MAX,
  ]);
  const [releaseYearRange, setReleaseYearRange] = useState<[number, number]>([
    config.releaseYearMin ?? YEAR_RANGE_MIN,
    config.releaseYearMax ?? YEAR_RANGE_MAX,
  ]);
  const [noteRange, setNoteRange] = useState<[number, number]>([
    config.noteImdbMin ?? NOTE_IMDB_MIN,
    config.noteImdbMax ?? NOTE_IMDB_MAX,
  ]);

  const aggregationOptions = ALLOWED_AGGREGATIONS[config.metric].map((value) => ({
    value,
    label: AGGREGATION_LABEL[value],
  }));
  const top20Allowed = enableTop20 && isTop20GroupByAllowed(config.metric, config.aggregation);
  const groupByOptions = (
    isGroupByRestricted(config.metric, config.aggregation) ? RESTRICTED_GROUP_BY_OPTIONS : GROUP_BY_OPTIONS
  ).filter((o) => top20Allowed || !TOP20_GROUP_BY_VALUES.includes(o.value));
  const legendAvailable = showLegend && supportsLegend(config.metric, config.aggregation);
  const legendOptions = LEGEND_BASE_OPTIONS.filter((o) => o.value !== config.groupBy);

  return (
    <>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Métrique</label>
        <PillToggle
          options={METRIC_OPTIONS}
          value={config.metric}
          onChange={(metric) => updateConfig({ metric })}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Agrégation</label>
        <PillToggle
          options={aggregationOptions}
          value={config.aggregation}
          onChange={(aggregation) => updateConfig({ aggregation: aggregation as DatavizAggregation })}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Groupement</label>
        <PillToggle
          options={groupByOptions}
          value={config.groupBy}
          onChange={(groupBy) => updateConfig({ groupBy, legendBy: config.legendBy === groupBy ? "none" : config.legendBy })}
        />
      </div>

      {legendAvailable && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Légende</label>
          <PillToggle
            options={legendOptions}
            value={config.legendBy}
            onChange={(legendBy) => updateConfig({ legendBy })}
          />
        </div>
      )}

      {config.groupBy === "period" && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type de période</label>
            <PillToggle
              options={PERIOD_MODE_OPTIONS}
              value={AGGREGATED_GRANULARITIES.has(config.granularity) ? "aggregated" : "fixed"}
              onChange={(mode) => updateConfig({ granularity: mode === "fixed" ? "month" : "weekday" })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Granularité</label>
            {(() => {
              const options = AGGREGATED_GRANULARITIES.has(config.granularity)
                ? AGGREGATED_GRANULARITY_OPTIONS
                : FIXED_GRANULARITY_OPTIONS;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted">
                    <span>{options.find((o) => o.value === config.granularity)?.label ?? options[0].label}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup
                      value={config.granularity}
                      onValueChange={(value) => updateConfig({ granularity: value as DatavizGranularity })}
                    >
                      {options.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })()}
          </div>
        </>
      )}

      <div className="space-y-3 border-t pt-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Type de média</label>
          <PillToggle
            options={MEDIA_TYPE_FILTER_OPTIONS}
            value={config.mediaType ?? "tout"}
            onChange={(value) => updateConfig({ mediaType: value === "tout" ? null : value })}
          />
        </div>

        <RangeSlider
          label="Année de visionnage"
          range={watchedYearRange}
          min={YEAR_RANGE_MIN}
          max={YEAR_RANGE_MAX}
          step={1}
          format={(n) => String(n)}
          onChange={setWatchedYearRange}
          onCommit={([min, max]) =>
            updateConfig({
              watchedYearMin: min === YEAR_RANGE_MIN ? null : min,
              watchedYearMax: max === YEAR_RANGE_MAX ? null : max,
            })
          }
        />

        <RangeSlider
          label="Année de sortie"
          range={releaseYearRange}
          min={YEAR_RANGE_MIN}
          max={YEAR_RANGE_MAX}
          step={1}
          format={(n) => String(n)}
          onChange={setReleaseYearRange}
          onCommit={([min, max]) =>
            updateConfig({
              releaseYearMin: min === YEAR_RANGE_MIN ? null : min,
              releaseYearMax: max === YEAR_RANGE_MAX ? null : max,
            })
          }
        />

        <RangeSlider
          label="Note IMDB"
          range={noteRange}
          min={NOTE_IMDB_MIN}
          max={NOTE_IMDB_MAX}
          step={0.5}
          format={(n) => n.toFixed(1)}
          onChange={setNoteRange}
          onCommit={([min, max]) =>
            updateConfig({
              noteImdbMin: min === NOTE_IMDB_MIN ? null : min,
              noteImdbMax: max === NOTE_IMDB_MAX ? null : max,
            })
          }
        />

        <div className="grid grid-cols-2 gap-2">
          <MultiSelectDropdown
            label="Genre"
            options={genres}
            selectedIds={config.genreIds}
            onToggle={(id) =>
              updateConfig({
                genreIds: config.genreIds.includes(id)
                  ? config.genreIds.filter((g) => g !== id)
                  : [...config.genreIds, id],
              })
            }
            onSelectAll={() => updateConfig({ genreIds: (genres ?? []).map((g) => g.id) })}
          />
          <MultiSelectDropdown
            label="Pays"
            options={countries}
            selectedIds={config.countryIds}
            onToggle={(id) =>
              updateConfig({
                countryIds: config.countryIds.includes(id)
                  ? config.countryIds.filter((c) => c !== id)
                  : [...config.countryIds, id],
              })
            }
            onSelectAll={() => updateConfig({ countryIds: (countries ?? []).map((c) => c.id) })}
          />
          <SearchableMultiSelectDropdown
            label="Studio"
            useOptions={useDatavizStudioOptions}
            selectedIds={config.studioIds}
            onToggle={(id) =>
              updateConfig({
                studioIds: config.studioIds.includes(id)
                  ? config.studioIds.filter((s) => s !== id)
                  : [...config.studioIds, id],
              })
            }
          />
          <SearchableMultiSelectDropdown
            label="Titre"
            useOptions={useDatavizTitleOptions}
            selectedIds={config.titleIds}
            onToggle={(id) =>
              updateConfig({
                titleIds: config.titleIds.includes(id)
                  ? config.titleIds.filter((t) => t !== id)
                  : [...config.titleIds, id],
              })
            }
          />
          <SearchableMultiSelectDropdown
            label="Acteur"
            useOptions={useDatavizActorOptions}
            selectedIds={config.actorIds}
            onToggle={(id) =>
              updateConfig({
                actorIds: config.actorIds.includes(id)
                  ? config.actorIds.filter((a) => a !== id)
                  : [...config.actorIds, id],
              })
            }
          />
          <SearchableMultiSelectDropdown
            label="Réalisateur"
            useOptions={useDatavizDirectorOptions}
            selectedIds={config.directorIds}
            onToggle={(id) =>
              updateConfig({
                directorIds: config.directorIds.includes(id)
                  ? config.directorIds.filter((d) => d !== id)
                  : [...config.directorIds, id],
              })
            }
          />
          <MultiSelectDropdown
            label="Listes"
            options={lists}
            selectedIds={config.listIds}
            onToggle={(id) =>
              updateConfig({
                listIds: config.listIds.includes(id)
                  ? config.listIds.filter((l) => l !== id)
                  : [...config.listIds, id],
              })
            }
            onSelectAll={() => updateConfig({ listIds: (lists ?? []).map((l) => l.id) })}
          />
        </div>
      </div>
    </>
  );
}
