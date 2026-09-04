import { resolveCrewRole } from '@emdb/tmdb-mapper';
export { resolveCrewRole };
/**
 * Crée le credit reliant une personne déjà connue (person_id) à un titre déjà
 * importé (title_id), sans importer le reste du casting/équipe du titre.
 * Utilisé par le refresh de filmographie (bug 27) : contrairement à
 * importTitleByTmdbId, on connaît déjà la personne et son rôle exact via
 * getPersonCombinedCredits, donc pas besoin de réimporter tous les autres
 * membres du casting pour retrouver cette seule ligne de credit.
 */
export declare function ensureCreditRecord(params: {
    titleId: string;
    personId: string;
    role: string;
    roleLibelle: string;
    personnage?: string | null;
    ordre?: number | null;
    episodeId?: string | null;
}): Promise<void>;
export declare function importPersonByTmdbId(tmdbId: number): Promise<{
    id: string;
    source: string;
    created_at: Date;
    tmdb_id: number | null;
    nom: string;
    genre: string | null;
    date_naissance: Date | null;
    pays_id: string | null;
    photo_url: string | null;
    bio: string | null;
    wiki_url: string | null;
}>;
/**
 * Résout l'URL Wikipedia d'une personne à la demande — appelée uniquement
 * quand sa fiche (GET /people/:id) est consultée, jamais pendant un import
 * de titre (cf. importPersonByTmdbId, qui ne résout plus wiki_url du tout).
 *
 * `people.wiki_url` sert de cache d'écriture : déjà résolu → retourné sans
 * appel réseau ; sinon résolu via Wikidata puis persisté pour les
 * consultations suivantes (évite de re-frapper l'API Wikidata, sujette au
 * rate-limit, à chaque vue de la même fiche). Toute erreur (réseau, 429,
 * personne sans wikidata_id) est avalée : wiki_url reste null, retenté à la
 * prochaine consultation.
 */
export declare function resolvePersonWikiUrl(personId: string): Promise<string | null>;
export declare function importEpisodeGuestCredits(episodeId: string, tmdbId: number, seasonNumber: number, episodeNumber: number): Promise<void>;
export declare function importTitleByTmdbId(tmdbId: number, type: 'film' | 'serie', options?: {
    withCredits?: boolean;
    creditRoles?: string[];
}): Promise<{
    id: string;
    source: string;
    created_at: Date;
    tmdb_id: number | null;
    type: string;
    titre_vo: string;
    titre_vf: string | null;
    synopsis: string | null;
    affiche_url: string | null;
    date_sortie: Date | null;
    duree_minutes: number | null;
    statut_serie: string | null;
    statut_production: string | null;
    note_imdb: import("@prisma/client/runtime/library").Decimal | null;
    is_animation: boolean;
    next_episode_air_date: Date | null;
}>;
/**
 * Importe/complète le casting+équipe d'un titre déjà connu localement, sans
 * toucher au reste de ses métadonnées (genres/pays/studios/saisons) — chemin
 * dédié pour un backfill de credits en masse (ex. `credits-import.worker.ts`)
 * après un import Trakt réalisé avec `withCredits: false` pour rester rapide.
 */
export declare function importCreditsForTitle(titleId: string, options?: {
    creditFilter?: string[];
}): Promise<{
    imported: number;
}>;
export declare function importSeasonsForSerie(titleId: string): Promise<void>;
export declare function refreshPersonData(personId: string): Promise<{
    id: string;
    source: string;
    created_at: Date;
    tmdb_id: number | null;
    nom: string;
    genre: string | null;
    date_naissance: Date | null;
    pays_id: string | null;
    photo_url: string | null;
    bio: string | null;
    wiki_url: string | null;
}>;
export declare function refreshTitleData(titleId: string): Promise<{
    id: string;
    source: string;
    created_at: Date;
    tmdb_id: number | null;
    type: string;
    titre_vo: string;
    titre_vf: string | null;
    synopsis: string | null;
    affiche_url: string | null;
    date_sortie: Date | null;
    duree_minutes: number | null;
    statut_serie: string | null;
    statut_production: string | null;
    note_imdb: import("@prisma/client/runtime/library").Decimal | null;
    is_animation: boolean;
    next_episode_air_date: Date | null;
}>;
/**
 * Génère des notifications pour les nouveaux épisodes des séries suivies.
 *
 * Algorithme :
 * 1. Récupérer toutes les séries en cours avec next_episode_air_date <= aujourd'hui
 * 2. Pour chaque série, trouver les utilisateurs qui la suivent
 * 3. Trouver le dernier épisode sorti non encore notifié
 * 4. Créer une notification par follower (déduplication par episode_id + type)
 *
 * @returns Nombre total de notifications créées
 * @phase 7.2
 */
export declare function generateNewEpisodeNotifications(): Promise<number>;
/**
 * Génère une notification pour la première d'une nouvelle saison.
 *
 * Déclenché quand une nouvelle saison est importée pour une série suivie.
 *
 * @param titleId - UUID de la série
 * @param seasonNumber - Numéro de la nouvelle saison
 * @returns Nombre de notifications créées
 * @phase 7.2
 */
export declare function generateSeasonPremiereNotification(titleId: string, seasonNumber: number): Promise<number>;
export declare function dailySyncNewEpisodes(): Promise<{
    titlesRefreshed: number;
    notificationsCreated: number;
}>;
/**
 * Pour chaque personne suivie par au moins un utilisateur, vérifie ses
 * crédits combinés TMDB (cast + équipe) et ajoute automatiquement à la
 * watchlist de CHAQUE utilisateur qui la suit tout titre pas encore sorti
 * (annoncé/à venir) découvert — cron quotidien, même métronome que
 * dailySyncNewEpisodes.
 *
 * Ne considère que les titres "futurs" (date de sortie/diffusion dans le
 * futur) — pas tout le catalogue déjà sorti d'une personne, qui serait
 * redondant avec sa filmographie.
 *
 * @returns Nombre d'ajouts effectifs à une watchlist (déduplique déjà
 *   gérée par l'upsert list_items, idempotent)
 */
export declare function checkFollowedPersonsForNewTitles(): Promise<{
    titlesAdded: number;
}>;
export declare function weeklyResyncChanges(startDate: string, endDate: string): Promise<{
    tmdbId: number;
    type: "film" | "serie";
}[]>;
/**
 * Bootstrap les recommandations TMDB pour une personne.
 *
 * Stratégie :
 * 1. Fetch getPersonCombinedCredits(personTmdbId) → tous les titres TMDB de cette personne
 * 2. Filtrer les titres déjà présents en local (prisma.titles.findMany)
 * 3. Pour chaque titre local, trouver les autres personnes (credits) qui y ont participé
 * 4. Calculer le score de similarité : Jaccard = intersection / union des credits
 * 5. Top 10 → person_recommendations
 *
 * @param personId - UUID de la personne en base
 * @returns Nombre de recommandations insérées
 * @throws Error si la personne n'existe pas ou n'a pas de tmdb_id
 */
export declare function bootstrapPersonRecommendationsFromTmdb(personId: string): Promise<number>;
export declare function bootstrapRecommendationsFromTmdb(titleId: string): Promise<{
    title_id: string;
    recommended_id: string;
    score: number;
}[]>;
