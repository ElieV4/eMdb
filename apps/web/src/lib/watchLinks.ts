import { BookOpen, Film, MonitorPlay } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WatchLink = {
  name: string;
  href: string;
  icon: LucideIcon;
};

export type WatchLinkMode = "film" | "serie";

function toSlug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "title"
  );
}

/**
 * Liens "gratuits" à slug deviné, vérifiés ensuite un par un (HEAD request
 * via /watch-links/validate, cf. TitleHero) — contrairement au module
 * "Streaming FR", dont la disponibilité réelle par plateforme vient de TMDB
 * watch/providers (cf. /watch-links/providers) plutôt que d'une URL devinée.
 */
export function buildFreeWatchLinks({
  title,
  type,
}: {
  title: string;
  type: WatchLinkMode;
}): WatchLink[] {
  const slug = encodeURIComponent(toSlug(title));

  return [
    {
      name: "WatchTV",
      href: `https://www.watchtv.click/${type === "film" ? "movie" : "series"}/${slug}/`,
      icon: MonitorPlay,
    },
    {
      name: "HydraFlix",
      href: `https://www.hydraflix.cc/${slug}/`,
      icon: Film,
    },
    {
      name: "MovieDB Wiki",
      href: `https://www.moviedb.wiki/${slug}/`,
      icon: BookOpen,
    },
  ].filter((link) => !!link.href && link.href.trim() !== "");
}
