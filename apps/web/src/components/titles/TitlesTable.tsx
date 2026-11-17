/**
 * Vue tableau générique des pages qui listent plusieurs titres (listes,
 * watchlist, recommandés, modules Découvrir, continuer à regarder) :
 * mêmes titres que la grille d'affiches, une ligne par titre, tri au clic
 * sur l'en-tête. Chaque page peut ajouter ses propres colonnes.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Eye, Heart, Star } from "lucide-react";
import { TitlePoster } from "@/components/titles/TitlePoster";
import { TitleQuickActionsMenu } from "@/components/titles/TitleQuickActionsMenu";
import { formatDuration } from "@/lib/cardFormatting";
import {
  BASE_COLUMNS,
  BaseColumnId,
  ExtraColumn,
  SortState,
  TitleRowFlags,
  nextSort,
  releaseYear,
  sortTitles,
} from "@/lib/titlesTable";
import { TitleSearchResult } from "@/lib/types/api";
import { buildEntityUrl, cn } from "@/lib/utils";

type TitlesTableProps = {
  titles: TitleSearchResult[];
  /** État vu / watchlist / favori de chaque titre (icônes et menu d'actions). */
  flagsOf?: (title: TitleSearchResult) => TitleRowFlags;
  /** Colonnes propres à la page, affichées après les colonnes communes. */
  extraColumns?: ExtraColumn[];
  /** Colonnes communes à masquer sur cette page. */
  hideColumns?: BaseColumnId[];
  className?: string;
};

function titleHref(title: TitleSearchResult) {
  return title.local
    ? buildEntityUrl("/titles", title.id, title.titre)
    : `/titles/tmdb/${title.tmdbId}?type=${title.type}`;
}

function baseCell(column: BaseColumnId, title: TitleSearchResult) {
  switch (column) {
    case "titre":
      return null; // rendu à part (affiche + lien)
    case "type":
      return title.type === "film" ? "Film" : "Série";
    case "annee":
      return releaseYear(title) ?? "—";
    case "duree":
      if (title.type === "film") return formatDuration(title.duree) ?? "—";
      return title.nombreEpisodes ? `${title.nombreEpisodes} ép.` : "—";
    case "note":
      return title.note != null ? (
        <span className="inline-flex items-center gap-1 text-amber-400">
          <Star className="h-3 w-3 fill-current" />
          {Number(title.note).toFixed(1)}
        </span>
      ) : (
        "—"
      );
  }
}

export function TitlesTable({
  titles,
  flagsOf,
  extraColumns = [],
  hideColumns = [],
  className,
}: TitlesTableProps) {
  const [sort, setSort] = useState<SortState>(null);
  const baseColumns = BASE_COLUMNS.filter((c) => !hideColumns.includes(c.id));

  const valueOf = (column: string, title: TitleSearchResult) => {
    const base = BASE_COLUMNS.find((c) => c.id === column);
    if (base) return base.sortValue(title);
    return extraColumns.find((c) => c.id === column)?.sortValue?.(title) ?? null;
  };
  const rows = sortTitles(titles, sort, valueOf);

  const header = (id: string, label: string, sortable: boolean) => {
    const active = sort?.column === id ? sort.direction : null;
    return (
      <th key={id} scope="col" className="px-3 py-2 text-left font-medium whitespace-nowrap">
        {sortable ? (
          <button
            type="button"
            onClick={() => setSort((s) => nextSort(s, id))}
            className="inline-flex items-center gap-1 hover:text-foreground"
            aria-label={`Trier par ${label}`}
          >
            {label}
            {active === "asc" && <ArrowUp className="h-3 w-3" />}
            {active === "desc" && <ArrowDown className="h-3 w-3" />}
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

  return (
    <div className={cn("relative overflow-x-auto rounded-lg border", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            {baseColumns.map((c) => header(c.id, c.label, true))}
            {extraColumns.map((c) => header(c.id, c.label, !!c.sortValue))}
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Statut
            </th>
            <th scope="col" className="px-3 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((title) => {
            const flags = flagsOf?.(title) ?? {};
            return (
              <tr key={title.id} className="border-t hover:bg-muted/30">
                {baseColumns.map((c) =>
                  c.id === "titre" ? (
                    <td key={c.id} className="px-3 py-2">
                      <Link href={titleHref(title)} className="flex items-center gap-3 hover:text-primary">
                        <TitlePoster
                          src={title.afficheUrl}
                          alt={title.titre}
                          title={title.titre}
                          type={title.type}
                          width={32}
                          height={48}
                          className="shrink-0 [&>div]:hidden"
                        />
                        <span className="font-medium line-clamp-2">{title.titre}</span>
                      </Link>
                    </td>
                  ) : (
                    <td key={c.id} className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {baseCell(c.id, title)}
                    </td>
                  ),
                )}
                {extraColumns.map((c) => (
                  <td key={c.id} className="px-3 py-2">
                    {c.render(title)}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    {flags.inFavorites && <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" aria-label="Favori" />}
                    {flags.inWatchlist && <Bookmark className="h-3.5 w-3.5 fill-current" aria-label="Dans la watchlist" />}
                    {flags.watched && <Eye className="h-3.5 w-3.5" aria-label="Déjà vu" />}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <TitleQuickActionsMenu
                    titleId={title.id}
                    tmdbId={title.tmdbId}
                    type={title.type}
                    local={title.local}
                    releaseDate={title.dateSortie}
                    inWatchlist={flags.inWatchlist}
                    inFavorites={flags.inFavorites}
                    watched={flags.watched}
                    className="bg-transparent hover:bg-muted [&_svg]:text-muted-foreground"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
