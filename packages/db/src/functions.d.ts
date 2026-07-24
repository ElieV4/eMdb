/**
 * Module des fonctions PL/pgSQL — Phase 1.3
 *
 * Ce module expose les fonctions stockées PostgreSQL définies dans packages/db/sql/db_init.sql.
 * Ces fonctions sont optimisées pour des calculs complexes et doivent être appelées
 * via Prisma.$queryRaw plutôt que réimplémentées côté application.
 *
 * @module db/functions
 */
/**
 * Résultat de fn_episodes_non_vus : nombre d'épisodes non vus
 */
export type EpisodesNonVusResult = number;
/**
 * Résultat de fn_progress_serie : progrès par saison
 */
export interface ProgressSerieResult {
  saison: number;
  vus: number;
  total: number;
}
/**
 * Compte le nombre d'épisodes **sortis et non vus** par un utilisateur pour une série.
 *
 * **Fonction SQL** : `fn_episodes_non_vus(p_user_id UUID, p_title_id UUID) RETURNS INT`
 *
 * **Utilisation** :
 * - Affichage dans le calendrier (Phase 4)
 * - Notification de nouveaux épisodes
 *
 * @param userId - UUID de l'utilisateur
 * @param titleId - UUID du titre (doit être de type 'serie')
 * @returns Promesse résolue avec le nombre d'épisodes non vus
 *
 * @example
 * ```typescript
 * const count = await countEpisodesNonVus('user-uuid-here', 'title-uuid-here');
 * // => 3 (l'utilisateur a 3 épisodes non vus)
 * ```
 */
export declare function countEpisodesNonVus(
  userId: string,
  titleId: string,
): Promise<EpisodesNonVusResult>;
/**
 * Récupère le progrès de visionnage par saison pour une série.
 *
 * **Fonction SQL** : `fn_progress_serie(p_user_id UUID, p_title_id UUID)
 * RETURNS TABLE(saison INT, vus INT, total INT)`
 *
 * **Utilisation** :
 * - Affichage du progrès sur la page détail d'une série (Phase 4)
 * - Calcul du pourcentage de visionnage
 *
 * @param userId - UUID de l'utilisateur
 * @param titleId - UUID du titre (doit être de type 'serie')
 * @returns Promesse résolue avec un tableau de progrès par saison
 *
 * @example
 * ```typescript
 * const progress = await getSerieProgress('user-uuid-here', 'title-uuid-here');
 * // => [{ saison: 1, vus: 10, total: 12 }, { saison: 2, vus: 5, total: 12 }]
 * ```
 */
export declare function getSerieProgress(
  userId: string,
  titleId: string,
): Promise<ProgressSerieResult[]>;
export interface WatchTimeByPeriodResult {
  user_id: string;
  periode_semaine: Date;
  periode_mois: Date;
  periode_annee: Date;
  minutes: number;
}
export interface WatchTimeByGenreResult {
  user_id: string;
  genre_id: string;
  minutes: number;
}
export interface WatchTimeByCountryResult {
  user_id: string;
  country_id: string;
  minutes: number;
}
export interface WatchTimeByAnimationResult {
  user_id: string;
  is_animation: boolean;
  minutes: number;
}
export interface WatchCountByGenreResult {
  user_id: string;
  genre_id: string;
  nb_items: number;
}
export interface WatchCountByPeriodResult {
  user_id: string;
  periode_semaine: Date;
  periode_mois: Date;
  periode_annee: Date;
  nb_items: number;
}
export interface WatchCountByCountryResult {
  user_id: string;
  country_id: string;
  nb_items: number;
}
export interface WatchCountByAnimationResult {
  user_id: string;
  is_animation: boolean;
  nb_items: number;
}
export declare function getWatchTimeByPeriod(userId: string): Promise<WatchTimeByPeriodResult[]>;
export declare function getWatchTimeByGenre(userId: string): Promise<WatchTimeByGenreResult[]>;
export declare function getWatchTimeByCountry(userId: string): Promise<WatchTimeByCountryResult[]>;
export declare function getWatchTimeByAnimation(
  userId: string,
): Promise<WatchTimeByAnimationResult[]>;
export declare function getWatchCountByGenre(userId: string): Promise<WatchCountByGenreResult[]>;
export declare function getWatchCountByPeriod(userId: string): Promise<WatchCountByPeriodResult[]>;
export declare function getWatchCountByCountry(
  userId: string,
): Promise<WatchCountByCountryResult[]>;
export declare function getWatchCountByAnimation(
  userId: string,
): Promise<WatchCountByAnimationResult[]>;
/**
 * Calcule le pourcentage de visionnage global pour une série.
 *
 * @param progress - Résultat de getSerieProgress()
 * @returns Pourcentage (0-100) ou 0 si aucune donnée
 *
 * @example
 * ```typescript
 * const progress = await getSerieProgress(userId, titleId);
 * const percentage = calculateSerieCompletion(progress);
 * // => 75 (75% de la série vue)
 * ```
 */
export declare function calculateSerieCompletion(progress: ProgressSerieResult[]): number;
/**
 * Calcule le nombre total d'épisodes non vus à partir du progrès.
 * Alternative à countEpisodesNonVus si on a déjà le progrès.
 *
 * @param progress - Résultat de getSerieProgress()
 * @returns Nombre total d'épisodes non vus
 */
export declare function calculateTotalNonVus(progress: ProgressSerieResult[]): number;
declare const _default: {
  countEpisodesNonVus: typeof countEpisodesNonVus;
  getSerieProgress: typeof getSerieProgress;
  calculateSerieCompletion: typeof calculateSerieCompletion;
  calculateTotalNonVus: typeof calculateTotalNonVus;
};
export default _default;
