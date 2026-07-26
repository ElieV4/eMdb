/**
 * Hero pour la page détail d'une personne.
 * Affiche la photo, le nom, la bio, le pays et la date de naissance.
 */

import Image from "next/image";
import { Calendar, Globe } from "lucide-react";
import { PersonDetail } from "@/lib/types/api";
import { cn } from "@/lib/utils";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const PLACEHOLDER_PERSON = "/placeholder-person.jpg";

interface PersonHeroProps {
  person: PersonDetail;
  className?: string;
}

export function PersonHero({ person, className }: PersonHeroProps) {
  const { nom, photo_url, bio, genre, date_naissance, countries } = person;

  const imageSrc = photo_url
    ? `${TMDB_IMAGE_BASE_URL}/w500${photo_url}`
    : PLACEHOLDER_PERSON;

  const age = date_naissance
    ? Math.floor(
        (Date.now() - new Date(date_naissance).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className={cn("flex flex-col md:flex-row gap-6", className)}>
      {/* Photo */}
      <div className="mx-auto md:mx-0 shrink-0">
        <div className="relative h-48 w-36 overflow-hidden rounded-lg bg-muted/20">
          <Image
            src={imageSrc}
            alt={nom}
            fill
            className="object-cover"
            sizes="144px"
          />
        </div>
      </div>

      {/* Infos */}
      <div className="flex-1 space-y-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">{nom}</h1>
          {genre && (
            <p className="text-sm text-muted-foreground mt-1">
              {genre === "Homme"
                ? "Acteur"
                : genre === "Femme"
                  ? "Actrice"
                  : genre}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {date_naissance && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Né(e) le {new Date(date_naissance).toLocaleDateString("fr-FR")}
                {age && ` (${age} ans)`}
              </span>
            </div>
          )}

          {countries && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>{countries.nom}</span>
            </div>
          )}
        </div>

        {bio && (
          <p className="text-sm text-muted-foreground line-clamp-4">{bio}</p>
        )}

        {person.wiki_url && (
          <a
            href={person.wiki_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Voir la page Wikipedia
          </a>
        )}
      </div>
    </div>
  );
}
