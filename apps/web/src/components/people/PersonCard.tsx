/**
 * Carte de personne pour les résultats de recherche et grilles.
 * Affiche la photo, le nom, et le rôle principal.
 */

import Link from "next/link";
import Image from "next/image";
import { PersonSearchResult } from "@/lib/types/api";
import { cn } from "@/lib/utils";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const PLACEHOLDER_PERSON = "/placeholder-person.jpg";

interface PersonCardProps {
  person: PersonSearchResult;
  className?: string;
  compact?: boolean;
  showRole?: boolean;
}

export function PersonCard({
  person,
  className,
  compact = false,
  showRole = true,
}: PersonCardProps) {
  const { id, nom, photoUrl, rolePrincipal } = person;

  const imageSrc = photoUrl
    ? `${TMDB_IMAGE_BASE_URL}/w500${photoUrl}`
    : PLACEHOLDER_PERSON;

  return (
    <Link
      href={`/people/${id}`}
      className={cn(
        "group block overflow-hidden rounded-lg transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      {/* Photo */}
      <div
        className={cn(
          "relative overflow-hidden bg-muted/20",
          compact ? "aspect-square w-full" : "aspect-[2/3] w-full",
        )}
      >
        <Image
          src={imageSrc}
          alt={nom}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 200px"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM0Mjk5OEYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI4MCIvPjwvZz48L2c+PC9zdmc+"
        />
      </div>

      {/* Infos */}
      <div className="p-3 bg-background">
        <div className="space-y-1">
          <h3
            className={cn(
              "font-semibold line-clamp-1 group-hover:text-primary",
              compact ? "text-sm" : "text-base",
            )}
          >
            {nom}
          </h3>

          {showRole && rolePrincipal && !compact && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {rolePrincipal}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// Variante pour afficher dans une liste (horizontal)
export function PersonCardHorizontal({
  person,
  className,
}: Omit<PersonCardProps, "compact" | "showRole">) {
  const { id, nom, photoUrl, rolePrincipal } = person;

  return (
    <Link
      href={`/people/${id}`}
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg transition-all duration-200",
        "hover:bg-muted/50",
        className,
      )}
    >
      {/* Photo */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted/20">
        <Image
          src={
            photoUrl
              ? `${TMDB_IMAGE_BASE_URL}/w185${photoUrl}`
              : PLACEHOLDER_PERSON
          }
          alt={nom}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary">
          {nom}
        </h3>
        {rolePrincipal && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {rolePrincipal}
          </p>
        )}
      </div>
    </Link>
  );
}
