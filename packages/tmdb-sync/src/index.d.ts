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
    tmdb_id: number | null;
    nom: string;
    genre: string | null;
    source: string;
    created_at: Date;
    date_naissance: Date | null;
    pays_id: string | null;
    photo_url: string | null;
    bio: string | null;
    wiki_url: string | null;
}>;
export declare function importEpisodeGuestCredits(episodeId: string, tmdbId: number, seasonNumber: number, episodeNumber: number): Promise<void>;
export declare function importTitleByTmdbId(tmdbId: number, type: 'film' | 'serie', options?: {
    withCredits?: boolean;
}): Promise<{
    id: string;
    tmdb_id: number | null;
    type: string;
    source: string;
    created_at: Date;
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
export declare function importSeasonsForSerie(titleId: string): Promise<void>;
export declare function refreshPersonData(personId: string): Promise<{
    id: string;
    tmdb_id: number | null;
    nom: string;
    genre: string | null;
    source: string;
    created_at: Date;
    date_naissance: Date | null;
    pays_id: string | null;
    photo_url: string | null;
    bio: string | null;
    wiki_url: string | null;
}>;
export declare function refreshTitleData(titleId: string): Promise<{
    id: string;
    tmdb_id: number | null;
    type: string;
    source: string;
    created_at: Date;
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
