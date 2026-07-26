/**
 * Composant d'affichage des crédits d'un titre (cast/crew groupés par rôle).
 * Utilise PersonBadge pour chaque personne.
 */

import { CreditGrouped } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { PersonBadge } from "@/components/people/PersonBadge";

interface TitleCreditsProps {
  credits: CreditGrouped;
  className?: string;
}

export function TitleCredits({ credits, className }: TitleCreditsProps) {
  const roles = Object.keys(credits);

  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aucun crédit disponible pour ce titre.
      </p>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {roles.map((role) => {
        const items = credits[role];
        if (!items || items.length === 0) return null;

        return (
          <div key={role}>
            <h3 className="text-lg font-semibold mb-3">{role}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {items.map((item) => (
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
          </div>
        );
      })}
    </div>
  );
}
