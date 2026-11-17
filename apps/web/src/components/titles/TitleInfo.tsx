/**
 * Composant d'affichage des métadonnées d'un titre.
 * Genres, pays, studios, date de sortie, durée, statut.
 */

import Link from "next/link";
import { Globe, Film } from "lucide-react";
import { TitleDetail } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface TitleInfoProps {
  title: TitleDetail;
  className?: string;
}

export function TitleInfo({ title, className }: TitleInfoProps) {
  const { statut, is_animation, title_genres, title_countries, title_studios } = title;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Genres */}
      {title_genres && title_genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {title_genres.map((tg) => (
            <span
              key={tg.id}
              className="px-3 py-1 text-sm rounded-full bg-muted/30"
            >
              {tg.genres.nom}
            </span>
          ))}
        </div>
      )}

      {/* Métadonnées restantes — durée/année/note déjà affichées sous le
          titre dans TitleHero */}
      {(is_animation || statut) && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {is_animation && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Film className="h-4 w-4" />
              <span>Animation</span>
            </div>
          )}

          {statut && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Statut : {statut}</span>
            </div>
          )}
        </div>
      )}

      {/* Pays */}
      {title_countries && title_countries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {title_countries.map((tc) => (
            <span
              key={tc.id}
              className="flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-muted/30"
            >
              <Globe className="h-3 w-3" />
              {tc.countries.nom}
            </span>
          ))}
        </div>
      )}

      {/* Studios */}
      {title_studios && title_studios.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Studios :</p>
          <div className="flex flex-wrap gap-2">
            {title_studios.map((ts) => (
              <Link
                key={ts.id}
                href={`/studios/${ts.studios.id}`}
                className="px-3 py-1 text-sm rounded-full bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                {ts.studios.nom}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
