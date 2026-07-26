/**
 * Hero banner pour la page détail d'un titre.
 * Affiche le backdrop, le poster, le titre, la note et le type.
 */

import Image from "next/image";
import { Star } from "lucide-react";
import { TitleDetail } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { TitlePoster } from "./TitlePoster";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

interface TitleHeroProps {
  title: TitleDetail;
  className?: string;
}

export function TitleHero({ title, className }: TitleHeroProps) {
  const {
    titre_vo,
    titre_vf,
    type,
    date_sortie,
    note_imdb,
    affiche_url,
    backdrop_url,
    statut,
  } = title;

  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;
  const displayTitle =
    titre_vf && titre_vf !== titre_vo ? titre_vo : titre_vo;

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden bg-muted/20",
        className,
      )}
    >
      {/* Backdrop */}
      {backdrop_url && (
        <div className="absolute inset-0">
          <Image
            src={`${TMDB_IMAGE_BASE_URL}/w1280${backdrop_url}`}
            alt=""
            fill
            className="object-cover opacity-30"
            sizes="100vw"
          />
        </div>
      )}

      <div className="relative flex flex-col md:flex-row gap-6 p-6">
        {/* Poster */}
        <div className="mx-auto md:mx-0 shrink-0">
          <TitlePoster
            src={affiche_url}
            alt={titre_vo}
            title={titre_vo}
            type={type}
            width={200}
            height={300}
            priority
          />
        </div>

        {/* Infos */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{displayTitle}</h1>
            {titre_vf && titre_vf !== titre_vo && (
              <p className="text-lg text-muted-foreground mt-1">
                {titre_vf}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {year && (
              <span className="text-muted-foreground">({year})</span>
            )}
            {note_imdb && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-medium">{note_imdb.toFixed(1)}</span>
              </span>
            )}
            {statut && (
              <span className="px-2 py-1 text-xs rounded-full bg-muted/30">
                {statut}
              </span>
            )}
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-full",
                type === "film"
                  ? "bg-primary/10 text-primary-foreground"
                  : "bg-secondary/10 text-secondary-foreground",
              )}
            >
              {type === "film" ? "Film" : "Série"}
            </span>
          </div>

          {title.synopsis && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {title.synopsis}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
