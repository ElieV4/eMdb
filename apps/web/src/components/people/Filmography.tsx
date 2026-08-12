/**
 * Filmographie d'une personne : liste unique de titres dédupliqués (un titre
 * n'apparaît qu'une fois même avec plusieurs rôles, ex. acteur ET
 * réalisateur sur le même film), avec badges de rôle et filtre par rôle
 * multi-sélection en haut (modification C — remplace l'ancien découpage en
 * sections séparées par rôle).
 * Module "classique" : une seule ligne défilante horizontalement (comme les
 * modules de l'accueil), au lieu d'une grille multi-lignes paginée.
 * Réutilise TitleCard avec le mapping filmographyToSearchResult.
 * Les filtres d'attribut (type, année, genre, pays, note IMDB) restent
 * pilotés depuis le header via les paramètres d'URL (bug #28/#33) — voir
 * @/lib/titleFilters. Le filtre par rôle est local à ce module.
 */

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  FilmographyGrouped,
  FilmographyItem,
  filmographyToSearchResult,
} from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { TitleCard } from "@/components/titles/TitleCard";
import { CardSlider } from "@/components/common/CardSlider";
import { useWatchedTitles, useListMembership } from "@/hooks/api";
import { parseTitleFilters } from "@/lib/titleFilters";
import { dedupeGroupedByEntity } from "@/lib/creditGrouping";

interface FilmographyProps {
  filmography: FilmographyGrouped;
  className?: string;
}

export function Filmography({ filmography, className }: FilmographyProps) {
  const searchParams = useSearchParams();
  const filters = parseTitleFilters(searchParams);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const { data: watchedTitles } = useWatchedTitles();
  const { watchlistIds, favoriteIds } = useListMembership();

  const allRoles = Object.keys(filmography).filter(
    (role) => (filmography[role]?.length ?? 0) > 0,
  );

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

  const deduped = dedupeGroupedByEntity(filmography, (item) => item.titre.id);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const filtered = deduped
    .filter((entry) => matchesFilters(entry.representative))
    .filter(
      (entry) =>
        selectedRoles.length === 0 ||
        entry.roleEntries.some((re) => selectedRoles.includes(re.role)),
    )
    // Date de sortie décroissante — titres sans date connue relégués en fin.
    .sort((a, b) => {
      const dateA = a.representative.titre.date_sortie
        ? new Date(a.representative.titre.date_sortie).getTime()
        : null;
      const dateB = b.representative.titre.date_sortie
        ? new Date(b.representative.titre.date_sortie).getTime()
        : null;
      if (dateA === null && dateB === null) return 0;
      if (dateA === null) return 1;
      if (dateB === null) return -1;
      return dateB - dateA;
    });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setSelectedRoles([])}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            selectedRoles.length === 0
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border",
          )}
        >
          Tout
        </button>
        {allRoles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => toggleRole(role)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              selectedRoles.includes(role)
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border",
            )}
          >
            {role}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Aucun titre pour ce filtre.
        </p>
      ) : (
        <CardSlider>
          {filtered.map((entry) => (
            <div key={entry.entityId} className="shrink-0 space-y-1">
              <TitleCard
                title={filmographyToSearchResult(entry.representative)}
                compact
                showType={false}
                watched={watchedTitles?.has(entry.representative.titre.id)}
                inWatchlist={watchlistIds.has(entry.representative.titre.id)}
                inFavorites={favoriteIds.has(entry.representative.titre.id)}
              />
              <div className="flex flex-wrap gap-1 px-1">
                {entry.roleEntries.map((re) => (
                  <span
                    key={re.role}
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted/40 text-muted-foreground"
                  >
                    {re.role}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardSlider>
      )}
    </div>
  );
}
