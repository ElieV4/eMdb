/**
 * Modules "Streaming officiel" / "Streaming libre" — côte à côte, même
 * largeur, chaque site affiché en carte uniforme (icône + nom centré +
 * sous-titre centré plus petit : mode d'accès pour l'officiel, statut de
 * vérification pour le libre). Partagé entre TitleHero et la page épisode
 * (auparavant deux copies divergentes de ce rendu).
 */

import { Loader2 } from "lucide-react";
import { WatchLink } from "@/lib/watchLinks";

type WatchLinksSectionProps = {
  officialProviders: WatchLink[];
  freeLinks: WatchLink[];
  isFreeLinksLoading: boolean;
};

function LinkCard({ link }: { link: WatchLink }) {
  const Icon = link.icon;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-background/70 px-1.5 text-center hover:bg-muted/60"
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span className="w-full truncate text-xs font-medium text-foreground">{link.name}</span>
      {link.subtitle && (
        <span className="w-full truncate text-[10px] text-muted-foreground">{link.subtitle}</span>
      )}
    </a>
  );
}

export function WatchLinksSection({
  officialProviders,
  freeLinks,
  isFreeLinksLoading,
}: WatchLinksSectionProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Streaming officiel
        </h2>
        {officialProviders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune plateforme disponible.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {officialProviders.map((link) => (
              <LinkCard key={link.name} link={link} />
            ))}
          </div>
        )}
      </div>

      {/* Module toujours affiché, même sans résultat (retour utilisateur) :
          on veut savoir si la vérification est en cours ou terminée sans
          rien trouver, plutôt que de faire disparaître le module. */}
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Streaming libre
          {isFreeLinksLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </h2>
        {isFreeLinksLoading ? (
          <p className="text-sm text-muted-foreground">Recherche en cours…</p>
        ) : freeLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun lien trouvé.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {freeLinks.map((link) => (
              <LinkCard key={link.name} link={link} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
