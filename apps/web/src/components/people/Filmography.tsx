/**
 * Filmographie d'une personne, groupée par rôle.
 * Réutilise TitleCard avec le mapping filmographyToSearchResult.
 * Les filtres (type, année, genre, pays, note IMDB) sont pilotés depuis le
 * header via les paramètres d'URL (bug #28/#33/#34) — voir @/lib/titleFilters.
 */

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FilmographyGrouped,
  FilmographyItem,
  filmographyToSearchResult,
} from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { TitleCard } from "@/components/titles/TitleCard";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { parseTitleFilters } from "@/lib/titleFilters";

interface FilmographyProps {
  filmography: FilmographyGrouped;
  className?: string;
}

const MAX_VISIBLE = 10;

export function Filmography({ filmography, className }: FilmographyProps) {
  const searchParams = useSearchParams();
  const filters = parseTitleFilters(searchParams);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>(
    {},
  );
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  const allRoles = Object.keys(filmography);

  if (allRoles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucune filmographie disponible pour cette personne.
      </p>
    );
  }

  const matchesFilters = (item: FilmographyItem) => {
    if (filters.type !== "tout" && item.titre.type !== filters.type)
      return false;

    const year = item.titre.date_sortie
      ? new Date(item.titre.date_sortie).getFullYear()
      : null;
    if (filters.yearMin !== null && (year === null || year < filters.yearMin))
      return false;
    if (filters.yearMax !== null && (year === null || year > filters.yearMax))
      return false;

    if (filters.genreIds.length > 0) {
      const itemGenreIds =
        item.titre.title_genres?.map((tg) => tg.genre_id) ?? [];
      if (!filters.genreIds.some((id) => itemGenreIds.includes(id)))
        return false;
    }

    if (filters.countryIds.length > 0) {
      const itemCountryIds =
        item.titre.title_countries?.map((tc) => tc.country_id) ?? [];
      if (!filters.countryIds.some((id) => itemCountryIds.includes(id)))
        return false;
    }

    if (filters.noteImdbMin !== null || filters.noteImdbMax !== null) {
      const note = item.titre.note_imdb ? Number(item.titre.note_imdb) : null;
      if (note === null) return false;
      if (filters.noteImdbMin !== null && note < filters.noteImdbMin)
        return false;
      if (filters.noteImdbMax !== null && note > filters.noteImdbMax)
        return false;
    }

    return true;
  };

  const filteredByRole = Object.fromEntries(
    allRoles.map((role) => [
      role,
      filmography[role]?.filter(matchesFilters) ?? [],
    ]),
  );

  const roles = allRoles.filter((role) => (filteredByRole[role]?.length ?? 0) > 0);

  return (
    <div className={cn("space-y-6", className)}>
      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Aucun titre pour ce filtre.
        </p>
      ) : (
        <div className="space-y-8">
          {roles.map((role) => {
            const items = filteredByRole[role];
            if (!items || items.length === 0) return null;

            const isExpanded = expandedRoles[role] ?? false;
            const displayedItems = isExpanded
              ? items
              : items.slice(0, MAX_VISIBLE);

            return (
              <div key={role}>
                <h3 className="text-lg font-semibold mb-4">{role}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {displayedItems.map((item) => (
                    <TitleCard
                      key={item.id}
                      title={filmographyToSearchResult(item)}
                      compact
                      showType={false}
                      watched={watchedTitles?.has(item.titre.id)}
                      inWatchlist={watchlistIds.has(item.titre.id)}
                      inFavorites={favoriteIds.has(item.titre.id)}
                    />
                  ))}
                </div>
                {items.length > MAX_VISIBLE && (
                  <button
                    onClick={() =>
                      setExpandedRoles((prev) => ({ ...prev, [role]: !isExpanded }))
                    }
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    {isExpanded
                      ? "Voir moins"
                      : `Voir plus (${items.length - MAX_VISIBLE} autres)`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
