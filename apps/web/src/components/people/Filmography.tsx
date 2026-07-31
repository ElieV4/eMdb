/**
 * Filmographie d'une personne, groupée par rôle.
 * Réutilise TitleCard avec le mapping filmographyToSearchResult.
 */

import { useState } from "react";
import { FilmographyGrouped, filmographyToSearchResult } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { TitleCard } from "@/components/titles/TitleCard";

interface FilmographyProps {
  filmography: FilmographyGrouped;
  className?: string;
}

const MAX_VISIBLE = 10;

type TypeFilter = "tout" | "film" | "serie";

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "tout", label: "Tout" },
  { id: "film", label: "Films" },
  { id: "serie", label: "Séries" },
];

export function Filmography({ filmography, className }: FilmographyProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("tout");
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>(
    {},
  );

  const allRoles = Object.keys(filmography);

  if (allRoles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucune filmographie disponible pour cette personne.
      </p>
    );
  }

  const filteredByRole =
    typeFilter === "tout"
      ? filmography
      : Object.fromEntries(
          allRoles.map((role) => [
            role,
            filmography[role]?.filter((item) => item.titre.type === typeFilter) ?? [],
          ]),
        );

  const roles = allRoles.filter((role) => (filteredByRole[role]?.length ?? 0) > 0);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center gap-2">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setTypeFilter(filter.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              typeFilter === filter.id
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

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
