/**
 * Formatage partagé du titre + sous-titre des cards (DateCard, ContinueWatchingCard)
 * sur Calendrier/Continuer à regarder/Historique — même structure partout :
 * - Série : "Titre - titre épisode" / "SXX EXX - {métrique}"
 * - Film   : "Titre (Année)" / "{métrique}"
 * La métrique est soit une durée (Calendrier, Continuer à regarder), soit
 * une note (Historique) — calculée en amont et passée en `metricLabel`.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "1h 05 min" (ou juste "45 min" sous l'heure) — null si durée inconnue. */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${pad2(m)} min` : `${m} min`;
}

/** "4,5" (note_perso /10 convertie en /5, virgule française) — null si non noté.
 * À afficher avec une icône étoile à côté (cf. HistoryCard) plutôt qu'un "*". */
export function formatRatingStars(notePerso: number | null | undefined): string | null {
  if (notePerso == null) return null;
  const stars = notePerso / 2;
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1).replace(".", ",");
}

/** "S01E01" (sans espace) — null si saison/épisode inconnus. */
export function formatSeasonEpisodeCompact(
  saison: number | null | undefined,
  episodeNumero: number | null | undefined,
): string | null {
  if (saison == null || episodeNumero == null) return null;
  return `S${pad2(saison)}E${pad2(episodeNumero)}`;
}

/** "2016 - 1h 42 min" (film) / "2016 - 50 ép." (série) — segments manquants
 * omis (ex: durée/nombre d'épisodes inconnus, ou année inconnue). Utilisé par
 * TitleCard (Watchlist, Recommandations, Découverte). */
export function buildTitleCardMeta(params: {
  type: "film" | "serie";
  annee?: number | null;
  duree?: number | null;
  nombreEpisodes?: number | null;
}): string | null {
  const parts: string[] = [];
  if (params.annee) parts.push(String(params.annee));

  if (params.type === "film") {
    const duration = formatDuration(params.duree);
    if (duration) parts.push(duration);
  } else if (params.nombreEpisodes != null && params.nombreEpisodes > 0) {
    parts.push(`${params.nombreEpisodes} ép.`);
  }

  return parts.length > 0 ? parts.join(" - ") : null;
}

export function buildCardText(params: {
  type: "film" | "serie";
  titre: string;
  annee?: number | null;
  episodeTitre?: string | null;
  saison?: number | null;
  episodeNumero?: number | null;
  metricLabel: string | null;
}): { title: string; subtitle: string | null } {
  if (params.type === "serie") {
    const title = params.episodeTitre ? `${params.titre} - ${params.episodeTitre}` : params.titre;
    const seasonEp =
      params.saison != null && params.episodeNumero != null
        ? `S${pad2(params.saison)} E${pad2(params.episodeNumero)}`
        : null;
    const subtitle = [seasonEp, params.metricLabel].filter(Boolean).join(" - ") || null;
    return { title, subtitle };
  }

  const title = params.annee ? `${params.titre} (${params.annee})` : params.titre;
  return { title, subtitle: params.metricLabel };
}
