/**
 * Liens "Streaming FR" (plateformes officielles réellement disponibles,
 * via TMDB watch/providers) et "Gratuit" (liens à slug deviné, validés un
 * par un) pour une fiche film/série — partagé entre TitleHero (page titre)
 * et la page détail d'épisode, qui affichaient auparavant deux copies
 * divergentes de cette logique (la version épisode n'était même pas
 * vérifiée : liens toujours affichés, qu'ils existent ou non).
 */

import { useEffect, useState } from "react";
import {
  Apple,
  Archive,
  Clapperboard,
  Play,
  Sparkles,
  Tv,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/apiClient";
import { buildFreeWatchLinks, WatchLink, WatchLinkMode } from "@/lib/watchLinks";

type AccessType = "abonnement" | "location" | "achat";

const ACCESS_LABELS: Record<AccessType, string> = {
  abonnement: "Abonnement",
  location: "Location",
  achat: "Achat",
};

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  netflix: Tv,
  prime: Play,
  canal: Clapperboard,
  disney: Sparkles,
  appletv: Apple,
};

export type OfficialProviderLink = WatchLink & { accessLabel: string };

export function useWatchLinks({
  titreVo,
  titreVf,
  type,
  tmdbId,
  anneeSortie,
}: {
  titreVo: string;
  titreVf?: string | null;
  type: WatchLinkMode;
  tmdbId?: number | null;
  anneeSortie?: number | null;
}) {
  const freeLinkCandidates = buildFreeWatchLinks({ title: titreVo, type });
  const [validFreeLinks, setValidFreeLinks] = useState<WatchLink[]>([]);
  const [officialProviders, setOfficialProviders] = useState<OfficialProviderLink[]>([]);

  // Streaming FR : uniquement les plateformes qui ont vraiment le titre
  // (TMDB watch/providers, données JustWatch). TMDB ne fournit pas de lien
  // direct par plateforme (Netflix/Disney+/Canal+ n'exposent pas d'API
  // publique pour ça) : chaque bouton pointe vers la même page TMDB
  // précise, qui liste les vrais liens vers chaque plateforme.
  useEffect(() => {
    let cancelled = false;

    const fetchOfficialProviders = async () => {
      if (!tmdbId) {
        setOfficialProviders([]);
        return;
      }
      try {
        const params = new URLSearchParams({ tmdbId: String(tmdbId), type, region: "FR" });
        const res = await fetch(`${API_BASE_URL}/watch-links/providers?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          watchUrl?: string | null;
          providers?: Array<{ key: string; name: string; accessTypes: AccessType[] }>;
        };
        if (cancelled || !data.watchUrl || !data.providers) return;

        setOfficialProviders(
          data.providers.map((p) => ({
            name: p.name,
            href: data.watchUrl as string,
            icon: PROVIDER_ICONS[p.key] ?? Tv,
            accessLabel: p.accessTypes.map((a) => ACCESS_LABELS[a]).join(" / "),
          })),
        );
      } catch {
        if (!cancelled) setOfficialProviders([]);
      }
    };

    void fetchOfficialProviders();

    return () => {
      cancelled = true;
    };
  }, [tmdbId, type]);

  useEffect(() => {
    let cancelled = false;

    const validateFreeLinks = async () => {
      const checks: Promise<WatchLink | null>[] = freeLinkCandidates.map(async (link) => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/watch-links/validate?url=${encodeURIComponent(link.href)}`,
            { cache: "no-store" },
          );
          const data = (await res.json()) as { valid?: boolean; status?: number };
          return data.valid === false ? null : link;
        } catch {
          return null;
        }
      });

      // Internet Archive : pas d'URL devinable (identifiant non prévisible),
      // recherche + vérification côté API (titre + langue VO/VF détectée si
      // possible) — uniquement pour les films.
      if (type === "film") {
        checks.push(
          (async () => {
            try {
              const params = new URLSearchParams({ titreVo });
              if (titreVf) params.set("titreVf", titreVf);
              if (anneeSortie) params.set("anneeSortie", String(anneeSortie));
              const res = await fetch(
                `${API_BASE_URL}/watch-links/archive-org?${params.toString()}`,
                { cache: "no-store" },
              );
              const data = (await res.json()) as {
                found?: boolean;
                url?: string;
                label?: "VO" | "VF" | null;
              };
              if (!data.found || !data.url) return null;
              return {
                name: data.label ? `Internet Archive (${data.label})` : "Internet Archive",
                href: data.url,
                icon: Archive,
              };
            } catch {
              return null;
            }
          })(),
        );
      }

      const checked = await Promise.all(checks);

      if (!cancelled) {
        setValidFreeLinks(checked.filter(Boolean) as WatchLink[]);
      }
    };

    void validateFreeLinks();

    return () => {
      cancelled = true;
    };
  }, [titreVo, titreVf, type, anneeSortie]);

  return { officialProviders, freeLinks: validFreeLinks };
}
