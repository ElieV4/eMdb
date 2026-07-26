/**
 * Filmographie d'une personne, groupée par rôle.
 * Réutilise TitleCard avec le mapping filmographyToSearchResult.
 */

import {
  FilmographyGrouped,
  filmographyToSearchResult,
} from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { TitleCard } from "@/components/titles/TitleCard";

interface FilmographyProps {
  filmography: FilmographyGrouped;
  className?: string;
}

export function Filmography({ filmography, className }: FilmographyProps) {
  const roles = Object.keys(filmography);

  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucune filmographie disponible pour cette personne.
      </p>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {roles.map((role) => {
        const items = filmography[role];
        if (!items || items.length === 0) return null;

        return (
          <div key={role}>
            <h3 className="text-lg font-semibold mb-4">{role}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map((item) => (
                <TitleCard
                  key={item.id}
                  title={filmographyToSearchResult(item)}
                  compact
                  showType={false}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
