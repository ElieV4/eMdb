/**
 * Import Module — BullMQ Configuration (bug #55/#56, bouton "Importer
 * depuis Trakt" de la page Profil).
 *
 * Configuration partagée entre l'API (déclenchement) et le worker
 * (traitement) pour la queue d'import Trakt.
 */
import { buildRedisConnection as buildRedisConnectionFromAdmin } from '../admin/bullmq.config';

/**
 * Nom de la queue BullMQ utilisée pour les jobs d'import Trakt.
 * Doit correspondre à TRAKT_IMPORT_QUEUE_NAME dans
 * apps/worker/src/trakt-import.worker.ts.
 */
export const TRAKT_IMPORT_QUEUE_NAME = 'trakt-import';

/**
 * Nom de la queue BullMQ utilisée pour les jobs d'import de credits (bouton
 * "Importer les credits" de la page Profil). Doit correspondre à
 * CREDITS_IMPORT_QUEUE_NAME dans apps/worker/src/credits-import.worker.ts.
 */
export const CREDITS_IMPORT_QUEUE_NAME = 'credits-import';

export const buildRedisConnection = buildRedisConnectionFromAdmin;
