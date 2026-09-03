/**
 * Badge compact pour afficher une personne (utilisé dans les distributions).
 * Affiche la photo en mini et le nom.
 */

import Link from "next/link";
import Image from "next/image";
import { Person } from "@/lib/types/api";
import { buildEntityUrl, cn } from "@/lib/utils";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const PLACEHOLDER_PERSON = "/placeholder-person.jpg";

interface PersonBadgeProps {
  person: Person;
  role?: string;
  className?: string;
  showRole?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PersonBadge({
  person,
  role,
  className,
  showRole = true,
  size = "md",
}: PersonBadgeProps) {
  const { id, nom, photoUrl } = person;

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const imageSrc = photoUrl
    ? `${TMDB_IMAGE_BASE_URL}/w185${photoUrl}`
    : PLACEHOLDER_PERSON;

  return (
    <Link
      href={buildEntityUrl("/people", id, nom)}
      className={cn(
        "group flex items-center gap-2 rounded-lg transition-colors duration-200",
        "hover:bg-muted/50 p-1",
        className,
      )}
    >
      {/* Photo en cercle */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-muted/20",
          sizeClasses[size],
        )}
      >
        <Image
          src={imageSrc}
          alt={nom}
          fill
          className="object-cover"
          sizes={`${size === "sm" ? "24px" : size === "md" ? "32px" : "40px"}`}
        />
      </div>

      {/* Nom et rôle */}
      <div className="min-w-0">
        <p
          className={cn(
            "font-medium line-clamp-1 group-hover:text-primary",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base",
          )}
          title={nom}
        >
          {nom}
        </p>
        {showRole && role && (
          <p
            className={cn(
              "text-muted-foreground line-clamp-1",
              size === "sm"
                ? "text-[10px]"
                : size === "md"
                  ? "text-xs"
                  : "text-sm",
            )}
            title={role}
          >
            {role}
          </p>
        )}
      </div>
    </Link>
  );
}

// Variante sans lien (pour les listes statiques)
export function PersonBadgeStatic({
  person,
  role,
  className,
  showRole = true,
  size = "md",
}: Omit<PersonBadgeProps, "person"> & { person: Person }) {
  const { nom, photoUrl } = person;

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const imageSrc = photoUrl
    ? `${TMDB_IMAGE_BASE_URL}/w185${photoUrl}`
    : PLACEHOLDER_PERSON;

  return (
    <div className={cn("flex items-center gap-2 rounded-lg p-1", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-muted/20",
          sizeClasses[size],
        )}
      >
        <Image
          src={imageSrc}
          alt={nom}
          fill
          className="object-cover"
          sizes={`${size === "sm" ? "24px" : size === "md" ? "32px" : "40px"}`}
        />
      </div>

      <div className="min-w-0">
        <p
          className={cn(
            "font-medium line-clamp-1",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base",
          )}
        >
          {nom}
        </p>
        {showRole && role && (
          <p
            className={cn(
              "text-muted-foreground line-clamp-1",
              size === "sm"
                ? "text-[10px]"
                : size === "md"
                  ? "text-xs"
                  : "text-sm",
            )}
            title={role}
          >
            {role}
          </p>
        )}
      </div>
    </div>
  );
}
