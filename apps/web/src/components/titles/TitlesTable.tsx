/**
 * Vue tableau générique des pages qui listent plusieurs titres (listes,
 * watchlist, recommandés, modules Découvrir, continuer à regarder).
 *
 * - Colonnes par défaut : affiche, titre, réalisation, sortie, durée ou
 *   nombre d'épisodes, ma note (avec les emojis d'émotion) ; menu d'actions
 *   en fin de ligne. Les autres (type, note IMDb, statut, genres, pays,
 *   émotions, colonnes propres à la page) s'ajoutent via « Colonnes »
 *   (barre d'outils), choix mémorisé par page.
 * - « Trier / filtrer » : choix du tri (colonne + sens) et filtres par
 *   colonne ; le clic sur un en-tête trie aussi.
 * - Valeurs modifiables (ma note...) en badges ; réalisateurs cliquables ;
 *   titre français en infobulle du titre.
 * - « Modifier le contenu » : colonne de cases à cocher tout à gauche.
 * - Recherche globale (barre d'outils) sur tous les champs.
 * - Réalisation, ma note et durée viennent de POST /titles/table-info
 *   (titres locaux uniquement).
 * - Style épuré : seulement des lignes horizontales.
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Eye, Heart, Star } from "lucide-react";
import { TitlePoster } from "@/components/titles/TitlePoster";
import { TitleQuickActionsMenu } from "@/components/titles/TitleQuickActionsMenu";
import { RatingBadgeMenu } from "@/components/ratings/RatingBadgeMenu";
import { SortControl } from "@/components/common/SortControl";
import { useTitlesTableInfo } from "@/hooks/api/useTitlesTableInfo";
import { useTitleEmotions } from "@/hooks/api/useTitleEmotions";
import { useUpsertRating } from "@/hooks/api/useUpsertRating";
import { useProgressiveRows } from "@/hooks/useProgressiveRows";
import { emotionEmojis, emotionLabels } from "@/lib/watchContext";
import { formatDuration } from "@/lib/cardFormatting";
import {
  BASE_COLUMNS,
  BaseColumnId,
  ExtraColumn,
  SortState,
  TitleRow,
  TitleRowFlags,
  countryNames,
  frenchTitleHint,
  genreNames,
  lengthValue,
  matchesColumnFilter,
  nextSort,
  releaseYear,
  rowMatchesSearch,
  sortRows,
} from "@/lib/titlesTable";
import { TitleSearchResult } from "@/lib/types/api";
import { buildEntityUrl, cn } from "@/lib/utils";

type TitlesTableProps = {
  titles: TitleSearchResult[];
  /** Clé de mémorisation des colonnes visibles (ex. "list", "watchlist"). */
  pageKey: string;
  flagsOf?: (title: TitleSearchResult) => TitleRowFlags;
  /** Colonnes propres à la page, proposées après les colonnes communes. */
  extraColumns?: ExtraColumn[];
  /** Colonnes communes non proposées sur cette page. */
  hideColumns?: BaseColumnId[];
  search?: string;
  filtersOpen?: boolean;
  columnsOpen?: boolean;
  /** « Modifier le contenu » : cases de sélection tout à gauche. */
  selection?: {
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    /** Coche (ou décoche) d'un coup toutes les lignes affichées. */
    onSetAll: (ids: string[], selected: boolean) => void;
  };
  className?: string;
};

function titleHref(title: TitleSearchResult) {
  return title.local
    ? buildEntityUrl("/titles", title.id, title.titre)
    : `/titles/tmdb/${title.tmdbId}?type=${title.type}`;
}

const storageKey = (pageKey: string) =>
  `emdb.titlesTable.visibleColumns.${pageKey}`;

export function TitlesTable({
  titles,
  pageKey,
  flagsOf,
  extraColumns = [],
  hideColumns = [],
  search = "",
  filtersOpen = false,
  columnsOpen = false,
  selection,
  className,
}: TitlesTableProps) {
  const [sort, setSort] = useState<SortState>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data: infoById } = useTitlesTableInfo(
    titles.filter((t) => t.local).map((t) => t.id),
  );
  const { data: emotionsById } = useTitleEmotions();
  const upsertRating = useUpsertRating();

  const baseColumns = BASE_COLUMNS.filter((c) => !hideColumns.includes(c.id));
  const allColumns = [
    ...baseColumns.map((c) => ({
      id: c.id as string,
      label: c.label,
      defaultVisible: c.defaultVisible,
    })),
    ...extraColumns.map((c) => ({
      id: c.id,
      label: c.label,
      defaultVisible: c.defaultVisible ?? true,
    })),
  ];
  const defaultVisible = allColumns
    .filter((c) => c.defaultVisible)
    .map((c) => c.id);

  const [visible, setVisible] = useState<string[]>(defaultVisible);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey(pageKey));
      if (saved) setVisible(JSON.parse(saved));
    } catch {
      // stockage indisponible : colonnes par défaut
    }
  }, [pageKey]);
  const toggleColumn = (id: string) => {
    const next = visible.includes(id)
      ? visible.filter((v) => v !== id)
      : [...visible, id];
    setVisible(next);
    try {
      window.localStorage.setItem(storageKey(pageKey), JSON.stringify(next));
    } catch {
      // idem
    }
  };
  const isVisible = (id: string) => id === "titre" || visible.includes(id);

  const rows: TitleRow[] = useMemo(
    () =>
      titles.map((title) => ({
        title,
        info: infoById?.[title.id] ?? undefined,
        emotions: title.local ? emotionsById?.[title.id] : undefined,
      })),
    [titles, infoById, emotionsById],
  );

  const extraText = (t: TitleSearchResult) =>
    extraColumns
      .map((c) => (c.sortValue ? String(c.sortValue(t) ?? "") : ""))
      .join(" ");

  const valueOf = (column: string, row: TitleRow) => {
    const base = BASE_COLUMNS.find((c) => c.id === column);
    if (base) return base.sortValue?.(row) ?? null;
    return (
      extraColumns.find((c) => c.id === column)?.sortValue?.(row.title) ?? null
    );
  };
  const textOf = (column: string, row: TitleRow) => {
    const base = BASE_COLUMNS.find((c) => c.id === column);
    if (base) return base.text(row);
    return String(
      extraColumns.find((c) => c.id === column)?.sortValue?.(row.title) ?? "",
    );
  };
  const filterKindOf = (column: string): "text" | "number" | null => {
    const base = BASE_COLUMNS.find((c) => c.id === column);
    if (base) return base.filter;
    const extra = extraColumns.find((c) => c.id === column);
    return extra?.sortValue ? "text" : null;
  };

  const shown = sortRows(
    rows.filter(
      (row) =>
        rowMatchesSearch(row, search, extraText(row.title)) &&
        Object.entries(filters).every(([column, f]) => {
          const kind = filterKindOf(column);
          return (
            !kind ||
            matchesColumnFilter(
              valueOf(column, row),
              textOf(column, row),
              kind,
              f,
            )
          );
        }),
    ),
    sort,
    valueOf,
  );

  const progressive = useProgressiveRows(
    shown.length,
    `${search}|${JSON.stringify(filters)}|${JSON.stringify(sort)}`,
  );
  const rendered = shown.slice(0, progressive.limit);
  const shownIds = shown.map((r) => r.title.id);
  const allShownSelected =
    !!selection &&
    shownIds.length > 0 &&
    shownIds.every((id) => selection.selectedIds.has(id));

  const visibleBase = baseColumns.filter((c) => isVisible(c.id));
  const visibleExtra = extraColumns.filter((c) => isVisible(c.id));
  const columnIds = [
    ...visibleBase.map((c) => c.id as string),
    ...visibleExtra.map((c) => c.id),
  ];
  const labelOf = (id: string) =>
    allColumns.find((c) => c.id === id)?.label ?? id;
  const sortable = (id: string) => {
    const base = BASE_COLUMNS.find((c) => c.id === id);
    if (base) return base.sortValue !== null;
    return !!extraColumns.find((c) => c.id === id)?.sortValue;
  };

  const baseCell = (
    column: BaseColumnId,
    row: TitleRow,
    flags: TitleRowFlags,
  ) => {
    const { title, info } = row;
    switch (column) {
      case "affiche":
        return (
          <Link href={titleHref(title)} tabIndex={-1} aria-hidden>
            <TitlePoster
              src={title.afficheUrl}
              alt={title.titre}
              title={title.titre}
              type={title.type}
              width={32}
              height={48}
              className="shrink-0 [&>div]:hidden"
            />
          </Link>
        );
      case "titre": {
        const vf = frenchTitleHint(row);
        return (
          <Link
            href={titleHref(title)}
            className="font-medium hover:text-primary line-clamp-2"
            title={vf ? `Titre français : ${vf}` : undefined}
          >
            {title.titre}
          </Link>
        );
      }
      case "realisation":
        return info?.realisateurs.length ? (
          <span className="text-muted-foreground">
            {info.realisateurs.map((d, i) => (
              <span key={d.id}>
                {i > 0 && ", "}
                <Link
                  href={buildEntityUrl("/people", d.id, d.nom)}
                  className="hover:text-primary hover:underline"
                >
                  {d.nom}
                </Link>
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      case "sortie":
        return (
          <span className="text-muted-foreground">
            {releaseYear(title) ?? "—"}
          </span>
        );
      case "duree": {
        const v = lengthValue(row);
        return (
          <span className="text-muted-foreground whitespace-nowrap">
            {v == null
              ? "—"
              : title.type === "film"
                ? formatDuration(v)
                : `${v} ép.`}
          </span>
        );
      }
      case "notePerso":
        return (
          <RatingBadgeMenu
            value={info?.notePerso}
            emotions={row.emotions}
            titleName={title.titre}
            onChange={
              title.local
                ? (note) =>
                    upsertRating.mutate({
                      title_id: title.id,
                      note_perso: note,
                    })
                : undefined
            }
          />
        );
      case "genres":
        return (
          <span className="text-muted-foreground">
            {genreNames(row).join(", ") || "—"}
          </span>
        );
      case "pays":
        return (
          <span className="text-muted-foreground">
            {countryNames(row).join(", ") || "—"}
          </span>
        );
      case "emotions":
        return row.emotions?.length ? (
          <span title={emotionLabels(row.emotions) ?? undefined}>
            {emotionEmojis(row.emotions)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      case "type":
        return (
          <span className="text-muted-foreground">
            {title.type === "film" ? "Film" : "Série"}
          </span>
        );
      case "noteImdb":
        return title.note != null ? (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <Star className="h-3 w-3 fill-current" />
            {Number(title.note).toFixed(1)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      case "statut":
        return (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {flags.inFavorites && (
              <Heart
                className="h-3.5 w-3.5 fill-red-500 text-red-500"
                aria-label="Favori"
              />
            )}
            {flags.inWatchlist && (
              <Bookmark
                className="h-3.5 w-3.5 fill-current"
                aria-label="Dans la watchlist"
              />
            )}
            {flags.watched && (
              <Eye className="h-3.5 w-3.5" aria-label="Déjà vu" />
            )}
          </span>
        );
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {columnsOpen && (
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border p-3">
          <legend className="px-1 text-xs text-muted-foreground">
            Colonnes affichées
          </legend>
          {allColumns.map((c) => (
            <label
              key={c.id}
              className="inline-flex items-center gap-1.5 text-sm"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={isVisible(c.id)}
                disabled={c.id === "titre"}
                onChange={() => toggleColumn(c.id)}
              />
              {c.label}
            </label>
          ))}
        </fieldset>
      )}

      {filtersOpen && (
        <SortControl
          options={allColumns
            .filter((c) => sortable(c.id))
            .map((c) => ({ id: c.id, label: c.label }))}
          sort={sort}
          onChange={setSort}
        />
      )}

      {/* `relative` : contient les éléments en position absolue (sr-only). */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              {selection && (
                <th scope="col" className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    aria-label="Tout sélectionner"
                    checked={allShownSelected}
                    onChange={() =>
                      selection.onSetAll(shownIds, !allShownSelected)
                    }
                  />
                </th>
              )}
              {columnIds.map((id) => {
                const active = sort?.column === id ? sort.direction : null;
                return (
                  <th
                    key={id}
                    scope="col"
                    className="px-2 py-2 font-medium whitespace-nowrap"
                  >
                    {id === "affiche" ? (
                      <span className="sr-only">{labelOf(id)}</span>
                    ) : sortable(id) ? (
                      <button
                        type="button"
                        onClick={() => setSort((s) => nextSort(s, id))}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        aria-label={`Trier par ${labelOf(id)}`}
                      >
                        {labelOf(id)}
                        {active === "asc" && <ArrowUp className="h-3 w-3" />}
                        {active === "desc" && <ArrowDown className="h-3 w-3" />}
                      </button>
                    ) : (
                      labelOf(id)
                    )}
                  </th>
                );
              })}
              <th scope="col" className="w-8 px-2 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
            {filtersOpen && (
              <tr>
                {selection && <th />}
                {columnIds.map((id) => {
                  const kind = filterKindOf(id);
                  return (
                    <th key={id} className="px-2 pb-2 font-normal">
                      {kind && (
                        <input
                          type={kind === "number" ? "number" : "text"}
                          value={filters[id] ?? ""}
                          onChange={(e) =>
                            setFilters((f) => ({ ...f, [id]: e.target.value }))
                          }
                          placeholder={kind === "number" ? "min." : "Filtrer"}
                          aria-label={`Filtrer ${labelOf(id)}`}
                          className="h-7 w-full min-w-16 rounded-md border bg-transparent px-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      )}
                    </th>
                  );
                })}
                <th />
              </tr>
            )}
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td
                  colSpan={columnIds.length + 1 + (selection ? 1 : 0)}
                  className="px-2 py-6 text-center text-muted-foreground"
                >
                  Aucun titre ne correspond.
                </td>
              </tr>
            ) : (
              rendered.map((row) => {
                const flags = flagsOf?.(row.title) ?? {};
                return (
                  <tr
                    key={row.title.id}
                    className={cn(
                      "border-b hover:bg-muted/20",
                      selection?.selectedIds.has(row.title.id) &&
                        "bg-primary/10",
                    )}
                  >
                    {selection && (
                      <td className="w-8 px-2 py-2 align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          aria-label={`Sélectionner ${row.title.titre}`}
                          checked={selection.selectedIds.has(row.title.id)}
                          onChange={() => selection.onToggle(row.title.id)}
                        />
                      </td>
                    )}
                    {visibleBase.map((c) => (
                      <td
                        key={c.id}
                        className={cn(
                          "px-2 py-2 align-middle",
                          c.id === "affiche" && "w-10",
                        )}
                      >
                        {baseCell(c.id, row, flags)}
                      </td>
                    ))}
                    {visibleExtra.map((c) => (
                      <td key={c.id} className="px-2 py-2 align-middle">
                        {c.render(row.title)}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right align-middle">
                      <TitleQuickActionsMenu
                        titleId={row.title.id}
                        tmdbId={row.title.tmdbId}
                        type={row.title.type}
                        local={row.title.local}
                        releaseDate={row.title.dateSortie}
                        inWatchlist={flags.inWatchlist}
                        inFavorites={flags.inFavorites}
                        watched={flags.watched}
                        className="bg-transparent hover:bg-muted [&_svg]:text-muted-foreground"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {progressive.hasMore && (
        <div ref={progressive.sentinelRef} className="flex justify-center py-3">
          <button
            type="button"
            onClick={progressive.showMore}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Afficher plus ({rendered.length} lignes sur {shown.length})
          </button>
        </div>
      )}
    </div>
  );
}
