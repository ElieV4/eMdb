/**
 * Hero pour la page détail d'un studio — reprend la structure de PersonHero,
 * simplifiée (un studio n'a ni bio ni date de naissance).
 */

import Image from "next/image";
import { StudioDetail } from "@/hooks/api/useStudio";
import { cn } from "@/lib/utils";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w300";
const PLACEHOLDER_STUDIO = "/placeholder-person.jpg";

interface StudioHeroProps {
  studio: StudioDetail;
  className?: string;
}

export function StudioHero({ studio, className }: StudioHeroProps) {
  const { nom, logo_url } = studio;

  const imageSrc = logo_url
    ? logo_url.startsWith("http")
      ? logo_url
      : `${TMDB_IMAGE_BASE_URL}${logo_url}`
    : PLACEHOLDER_STUDIO;

  return (
    <div className={cn("flex flex-col md:flex-row gap-6 items-center md:items-start", className)}>
      <div className="mx-auto md:mx-0 shrink-0">
        <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-muted/20 flex items-center justify-center">
          <Image
            src={imageSrc}
            alt={nom}
            fill
            className="object-contain p-4"
            sizes="128px"
          />
        </div>
      </div>

      <div className="flex-1 space-y-2 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold">{nom}</h1>
        <p className="text-sm text-muted-foreground">Studio de production</p>
      </div>
    </div>
  );
}
