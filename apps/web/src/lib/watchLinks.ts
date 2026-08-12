import { BookOpen, Film, MonitorPlay } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WatchLink = {
  name: string;
  href: string;
  icon: LucideIcon;
};

export type WatchLinkMode = "film" | "serie";

/**
 * Icône par site "gratuit" whitelisté — la recherche + vérification (titre,
 * année, hash d'affiche TMDB) se fait désormais côté backend
 * (GET /watch-links/free, cf. apps/api/src/watch-links.util.ts), qui ne
 * connaît que des noms de site en string ; ce module ne fait plus que
 * l'association nom -> icône pour l'affichage.
 */
const FREE_SITE_ICONS: Record<string, LucideIcon> = {
  WatchTV: MonitorPlay,
  HydraFlix: Film,
  "MovieDB Wiki": BookOpen,
};

export function iconForFreeSite(name: string): LucideIcon {
  return FREE_SITE_ICONS[name] ?? Film;
}
