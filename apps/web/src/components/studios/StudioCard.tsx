/**
 * Carte de studio pour les résultats de recherche — reprend la structure de
 * PersonCard, simplifiée (logo au lieu d'une photo, pas de rôle).
 */

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w300";
const PLACEHOLDER_STUDIO = "/placeholder-person.jpg";

export type StudioSearchResult = {
  id: string;
  tmdbId: number | null;
  nom: string;
  logoUrl?: string | null;
};

interface StudioCardProps {
  studio: StudioSearchResult;
  className?: string;
  compact?: boolean;
}

export function StudioCard({ studio, className, compact = false }: StudioCardProps) {
  const { id, nom, logoUrl } = studio;
  const imageSrc = logoUrl
    ? logoUrl.startsWith("http")
      ? logoUrl
      : `${TMDB_IMAGE_BASE_URL}${logoUrl}`
    : PLACEHOLDER_STUDIO;

  return (
    <Link
      href={`/studios/${id}`}
      className={cn(
        "group block overflow-hidden rounded-lg transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted/20 flex items-center justify-center",
          compact ? "aspect-square w-full" : "aspect-[2/3] w-full",
        )}
      >
        <Image
          src={imageSrc}
          alt={nom}
          fill
          className="object-contain p-4"
          sizes="(max-width: 768px) 100vw, 200px"
        />
      </div>

      <div className="p-3 bg-background">
        <h3
          className={cn(
            "font-semibold line-clamp-1 text-center group-hover:text-primary",
            compact ? "text-sm" : "text-base",
          )}
          title={nom}
        >
          {nom}
        </h3>
      </div>
    </Link>
  );
}
