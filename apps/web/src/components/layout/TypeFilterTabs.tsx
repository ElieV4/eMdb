/**
 * Onglets de filtre par type (Tout/Film/Série/Personne) — partagés entre le
 * header (affiché au centre quand le panneau "Filtres" est fermé), le menu
 * mobile, et le panneau "Filtres" lui-même (affiché en premier item quand il
 * est ouvert — modification O : le filtre par type migre du header vers le
 * panneau à l'ouverture, et inversement à la fermeture).
 */

import { cn } from "@/lib/utils";

export type FilterTab = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

export function TypeFilterTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: FilterTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-all duration-200 sm:px-3",
            active === tab.id
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
          aria-label={tab.label}
          title={tab.label}
        >
          {tab.icon}
          {/* Icône seule si trop peu de place (retour utilisateur) — le
              libellé ne réapparaît qu'à partir de sm (640px). */}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
