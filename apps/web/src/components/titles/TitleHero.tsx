/**
 * Hero banner pour la page détail d'un titre.
 * Affiche le backdrop, le poster, le titre, la note et le type.
 */

import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, ExternalLink, Star } from "lucide-react";
import { CreditGrouped, TitleDetail } from "@/lib/types/api";
import { useWatchLinks } from "@/hooks/useWatchLinks";
import { useAuthStore } from "@/store/authStore";
import { buildEntityUrl, cn } from "@/lib/utils";
import { TitlePoster } from "./TitlePoster";
import { TitleInfo } from "./TitleInfo";
import { WatchLinksSection } from "./WatchLinksSection";
import { ProgressSerie } from "@/components/watches/ProgressSerie";
import { TitleActions } from "./TitleActions";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

interface TitleHeroProps {
  title: TitleDetail;
  /** Optionnel : sert à afficher "Réalisé par" (bug #36) sans bloquer le rendu du hero si absent/en cours de chargement. */
  credits?: CreditGrouped;
  className?: string;
}

export function TitleHero({ title, credits, className }: TitleHeroProps) {
  const {
    titre_vo,
    titre_vf,
    type,
    date_sortie,
    duree_minutes,
    note_imdb,
    affiche_url,
    backdrop_url,
    tmdb_id,
  } = title;

  const directors = credits?.["Réalisateur"] ?? [];
  const year = date_sortie ? new Date(date_sortie).getFullYear() : null;
  const displayTitle = titre_vf && titre_vf !== titre_vo ? titre_vo : titre_vo;
  const { isAuthenticated } = useAuthStore();

  const { officialProviders, freeLinks, isFreeLinksLoading } = useWatchLinks({
    titreVo: titre_vo,
    titreVf: titre_vf,
    type,
    tmdbId: tmdb_id,
    anneeSortie: year,
    afficheUrl: affiche_url,
  });

  return (
    <>
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

      <div className="relative p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-6">
        {/* Poster + actions utilisateur (compactes, sous l'affiche) */}
        <div className="mx-auto md:mx-0 shrink-0 flex flex-col items-center gap-3">
          <TitlePoster
            src={affiche_url}
            alt={titre_vo}
            title={titre_vo}
            type={type}
            width={200}
            height={300}
            priority
          />
          <TitleActions titleId={title.id} type={type} releaseDate={date_sortie} />
        </div>

        {/* Infos */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{displayTitle}</h1>
            {titre_vf && titre_vf !== titre_vo && (
              <p className="text-lg text-muted-foreground mt-1">{titre_vf}</p>
            )}
            {directors.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Réalisé par{" "}
                {directors.map((director, index) => (
                  <span key={director.id}>
                    {index > 0 && ", "}
                    <Link
                      href={buildEntityUrl("/people", director.personne.id, director.personne.nom)}
                      className="text-foreground hover:underline"
                    >
                      {director.personne.nom}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-center text-sm">
            {duree_minutes && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {duree_minutes} min
              </span>
            )}
            {year && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {year}
              </span>
            )}
            {note_imdb && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-medium">
                  {Number(note_imdb).toFixed(1)}
                </span>
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

          <TitleInfo title={title} />

          {tmdb_id && (
            <a
              href={`https://www.themoviedb.org/${type === "film" ? "movie" : "tv"}/${tmdb_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voir sur TMDB
            </a>
          )}
        </div>
        </div>

        {/* Barre de progression série — fine, pleine largeur, pied du hero */}
        {type === "serie" && isAuthenticated && (
          <ProgressSerie
            titleId={title.id}
            variant="bar"
            className="border-t border-border/50 pt-3"
          />
        )}
      </div>
    </div>

    {/* Streaming officiel/libre — sous le hero, pas dedans */}
    <div className="mt-6">
      <WatchLinksSection
        officialProviders={officialProviders}
        freeLinks={freeLinks}
        isFreeLinksLoading={isFreeLinksLoading}
      />
    </div>
    </>
  );
}
