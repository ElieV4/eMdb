import {
  Apple,
  BookOpen,
  Clapperboard,
  ExternalLink,
  Film,
  MonitorPlay,
  Play,
  Sparkles,
  Tv,
} from "lucide-react";
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
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "title"
  );
}

export function buildWatchLinks({
  title,
  type,
  tmdbId,
}: {
  title: string;
  type: WatchLinkMode;
  tmdbId?: number | null;
}): {
  officialLinks: WatchLink[];
  freeLinks: WatchLink[];
} {
  const slug = encodeURIComponent(toSlug(title));
  const query = encodeURIComponent(title.trim());

  const officialLinks: WatchLink[] = [
    tmdbId
      ? {
          name: "Voir sur TMDB",
          href: `https://www.themoviedb.org/${type === "film" ? "movie" : "tv"}/${tmdbId}`,
          icon: ExternalLink,
        }
      : null,
    {
      name: "Netflix",
      href: `https://www.netflix.com/search?q=${query}`,
      icon: Tv,
    },
    {
      name: "Prime Video",
      href: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`,
      icon: Play,
    },
    {
      name: "Canal+",
      href: `https://www.canalplus.com/search?query=${query}`,
      icon: Clapperboard,
    },
    {
      name: "Disney+",
      href: `https://www.disneyplus.com/search?q=${query}`,
      icon: Sparkles,
    },
    {
      name: "Apple TV",
      href: `https://tv.apple.com/search?term=${query}`,
      icon: Apple,
    },
  ].filter((link): link is WatchLink => !!link && !!link.href && link.href.trim() !== "");

  const freeLinks: WatchLink[] = [
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

  return { officialLinks, freeLinks };
}