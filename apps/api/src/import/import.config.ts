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

export const buildRedisConnection = buildRedisConnectionFromAdmin;
