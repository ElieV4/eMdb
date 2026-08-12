/**
 * Hero banner pour la page détail d'un titre.
 * Affiche le backdrop, le poster, le titre, la note et le type.
 */

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Loader2, Star, Tv } from "lucide-react";
import { CreditGrouped, TitleDetail } from "@/lib/types/api";
import { useWatchLinks } from "@/hooks/useWatchLinks";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { TitlePoster } from "./TitlePoster";
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
    note_imdb,
    affiche_url,
    backdrop_url,
    statut,
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
  });

  // Module toujours affiché, même sans résultat (retour utilisateur) : on
  // veut savoir si la vérification est en cours ou terminée sans rien
  // trouver, plutôt que de faire disparaître le module dans les deux cas.
  const renderFreeLinks = () => (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Gratuit / sites whitelistés
        {isFreeLinksLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </h2>
      {isFreeLinksLoading ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Recherche en cours…
        </p>
      ) : freeLinks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun lien trouvé.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {freeLinks.map((link) => {
            const LinkIcon = link.icon;
            return (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 text-sm text-foreground hover:bg-muted/60"
              >
                {LinkIcon && <LinkIcon className="h-3.5 w-3.5" />}
                {link.name}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderOfficialProviders = () => {
    if (officialProviders.length === 0) return null;

    return (
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Tv className="h-4 w-4" />
          Streaming FR
        </h2>
        <div className="flex flex-wrap gap-2">
          {officialProviders.map((provider) => {
            const ProviderIcon = provider.icon;
            return (
              <a
                key={provider.name}
                href={provider.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-col items-start gap-0.5 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-sm text-foreground hover:bg-muted/60"
              >
                <span className="inline-flex items-center gap-1.5">
                  {ProviderIcon && <ProviderIcon className="h-3.5 w-3.5" />}
                  {provider.name}
                </span>
                <span className="text-xs text-muted-foreground">{provider.accessLabel}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  };

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
              <p className="text-lg text-muted-foreground mt-1">{titre_vf}</p>
            )}
            {directors.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Réalisé par{" "}
                {directors.map((director, index) => (
                  <span key={director.id}>
                    {index > 0 && ", "}
                    <Link
                      href={`/people/${director.personne.id}`}
                      className="text-foreground hover:underline"
                    >
                      {director.personne.nom}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {year && <span className="text-muted-foreground">({year})</span>}
            {note_imdb && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-medium">
                  {Number(note_imdb).toFixed(1)}
                </span>
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

          <div className="grid gap-4 pt-2 md:grid-cols-2">
            {renderOfficialProviders()}
            {renderFreeLinks()}
          </div>

          {type === "serie" && isAuthenticated && (
            <ProgressSerie
              titleId={title.id}
              className="rounded-lg border border-border bg-background/40 p-3"
            />
          )}

          {/* Actions utilisateur — regroupées en bas du hero */}
          <TitleActions
            titleId={title.id}
            type={type}
            releaseDate={date_sortie}
            className="pt-2 border-t border-border/50"
          />
        </div>
      </div>
    </div>
  );
}
