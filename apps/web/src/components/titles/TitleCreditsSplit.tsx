/**
 * Composant d'affichage des crédits avec séparation distribution/équipe technique.
 * Affiche les acteurs et l'équipe technique avec limite de 10 + "voir plus".
 */

"use client";

import { useState } from "react";
import { CreditGrouped } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { PersonBadge } from "@/components/people/PersonBadge";

interface TitleCreditsSplitProps {
  credits: CreditGrouped;
  titleType?: "film" | "serie";
  className?: string;
}

const CREW_ROLES = [
  "Director",
  "Director of Photography",
  "Writer",
  "Screenplay",
  "Original Music Composer",
  "Composer",
  "Editor",
  "Casting",
  "Executive Producer",
  "Producer",
];

export function TitleCreditsSplit({
  credits,
  titleType,
  className,
}: TitleCreditsSplitProps) {
  const [showAllActors, setShowAllActors] = useState(false);
  const [showAllCrew, setShowAllCrew] = useState(false);

  // Séparer les acteurs de l'équipe technique
  const actorRoles = Object.keys(credits).filter(
    (role) => !CREW_ROLES.includes(role),
  );
  const crewRoles = Object.keys(credits).filter((role) =>
    CREW_ROLES.includes(role),
  );

  // Combiner tous les acteurs
  const allActors = actorRoles.flatMap((role) => credits[role] ?? []);
  const displayedActors = showAllActors ? allActors : allActors.slice(0, 10);

  // Combiner toute l'équipe technique
  const allCrew = crewRoles.flatMap((role) => credits[role] ?? []);
  const displayedCrew = showAllCrew ? allCrew : allCrew.slice(0, 10);

  if (actorRoles.length === 0 && crewRoles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucun crédit disponible pour ce titre.
      </p>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Distribution (Acteurs) */}
      {allActors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Distribution</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {displayedActors.map((item) => (
              <PersonBadge
                key={item.id}
                person={{
                  id: item.personne.id,
                  nom: item.personne.nom,
                  photoUrl: item.personne.photo_url ?? undefined,
                }}
                role={
                  titleType === "serie" && item.personnage
                    ? `${item.personnage} (${item.ordre ?? 0} ép.)`
                    : item.personnage ?? undefined
                }
                size="md"
              />
            ))}
          </div>
          {allActors.length > 10 && (
            <button
              onClick={() => setShowAllActors(!showAllActors)}
              className="mt-3 text-sm text-primary hover:underline"
            >
              {showAllActors
                ? "Voir moins"
                : `Voir plus (${allActors.length - 10} autres)`}
            </button>
          )}
        </div>
      )}

      {/* Équipe technique */}
      {allCrew.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Équipe technique</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {displayedCrew.map((item) => (
              <PersonBadge
                key={item.id}
                person={{
                  id: item.personne.id,
                  nom: item.personne.nom,
                  photoUrl: item.personne.photo_url ?? undefined,
                }}
                role={item.personnage ?? undefined}
                size="md"
              />
            ))}
          </div>
          {allCrew.length > 10 && (
            <button
              onClick={() => setShowAllCrew(!showAllCrew)}
              className="mt-3 text-sm text-primary hover:underline"
            >
              {showAllCrew
                ? "Voir moins"
                : `Voir plus (${allCrew.length - 10} autres)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
