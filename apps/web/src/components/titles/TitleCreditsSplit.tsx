/**
 * Composant d'affichage des crédits d'un titre : liste unique dédupliquée
 * (une personne n'apparaît qu'une fois même avec plusieurs rôles, ex. acteur
 * ET réalisateur), avec filtre par rôle multi-sélection en haut (modification C).
 * Module "classique" : une seule ligne défilante horizontalement (même format
 * que le module Filmographie de la page personne), avec des cartes "affiche"
 * (tête + nom + rôle en sous-titre) plutôt que les badges compacts précédents.
 *
 * Remplace l'ancien découpage Distribution/Équipe technique : celui-ci
 * comparait les libellés de rôle stockés en base (français : "Réalisateur",
 * "Producteur", ...) à une liste `CREW_ROLES` en anglais ("Director",
 * "Producer", ...), qui ne matchait jamais — tout le monde atterrissait dans
 * "Distribution".
 */

"use client";

import { useState } from "react";
import { CreditGrouped } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { PersonCard } from "@/components/people/PersonCard";
import { CardSlider } from "@/components/common/CardSlider";
import { dedupeGroupedByEntity } from "@/lib/creditGrouping";

interface TitleCreditsSplitProps {
  credits: CreditGrouped;
  titleType?: "film" | "serie";
  className?: string;
}

export function TitleCreditsSplit({
  credits,
  className,
}: TitleCreditsSplitProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const allRoles = Object.keys(credits).filter(
    (role) => (credits[role]?.length ?? 0) > 0,
  );

  const deduped = dedupeGroupedByEntity(credits, (item) => item.personne.id);

  if (allRoles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucun crédit disponible pour ce titre.
      </p>
    );
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const filtered =
    selectedRoles.length === 0
      ? deduped
      : deduped.filter((entry) =>
          entry.roleEntries.some((re) => selectedRoles.includes(re.role)),
        );

  const roleSubtitle = (entry: (typeof deduped)[number]) =>
    entry.roleEntries
      .map((re) =>
        re.role === "Acteur" && re.item.personnage
          ? `${re.role} (${re.item.personnage})`
          : re.role,
      )
      .join(" • ");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setSelectedRoles([])}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            selectedRoles.length === 0
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border",
          )}
        >
          Tout
        </button>
        {allRoles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => toggleRole(role)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              selectedRoles.includes(role)
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border",
            )}
          >
            {role}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Aucun crédit pour ce filtre.
        </p>
      ) : (
        <CardSlider>
          {filtered.map((entry) => (
            <PersonCard
              key={entry.entityId}
              person={{
                id: entry.representative.personne.id,
                nom: entry.representative.personne.nom,
                photoUrl: entry.representative.personne.photo_url ?? undefined,
                rolePrincipal: roleSubtitle(entry),
                local: true,
              }}
              className="shrink-0 w-32 sm:w-36"
            />
          ))}
        </CardSlider>
      )}
    </div>
  );
}
