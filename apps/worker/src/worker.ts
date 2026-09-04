import Redis from 'ioredis';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { Queue, Worker, JobScheduler, JobsOptions } from 'bullmq';
import { prisma } from '@emdb/db';
import {
  importTitleByTmdbId,
  importSeasonsForSerie,
  refreshTitleData,
  dailySyncNewEpisodes,
  weeklyResyncChanges,
  generateNewEpisodeNotifications,
  checkFollowedPersonsForNewTitles,
  checkFollowedStudiosForNewTitles,
} from '@emdb/tmdb-sync';
import { checkFestivalSelections } from './festival-notifications.worker';

export type ImportJobData =
  | { type: 'import-title'; tmdb_id: number; title_type: 'film' | 'serie' }
  | { type: 'import-seasons'; title_id: string }
  | { type: 'refresh-title'; title_id: string };

export type CronJobData =
  | { type: 'daily-sync-new-episodes' }
  | { type: 'weekly-resync-changes'; startDate?: string; endDate?: string }
  | { type: 'refresh-materialized-views' }
  | { type: 'generate-notifications' }
  | { type: 'clean-notifications' }
  | { type: 'check-followed-persons' }
  | { type: 'check-followed-studios' }
  | { type: 'check-festival-selections' };

export const IMPORT_QUEUE_NAME = 'tmdb-import';
export const CRON_QUEUE_NAME = 'tmdb-cron';

export const DEFAULT_WORKER_CONCURRENCY = 5;

export function buildRedisConnection(redisUrl: string) {
  // BullMQ exige `maxRetriesPerRequest: null` sur la connexion utilisée par
  // un `Worker` (commandes bloquantes) — sans ça, toute création de Worker
  // (import/cron/recommendations/trakt-import) échouait immédiatement au
  // démarrage ("Your redis options maxRetriesPerRequest must be null"),
  // ce qui rendait `apps/worker` non démarrable en pratique.
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

export function getWeeklyResyncRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * Reconstruit les 8 tables dataviz (ex mv_watch_*) via dbt (packages/dbt-analytics)
 * au lieu d'un REFRESH MATERIALIZED VIEW SQL brut : les tests dbt (not_null,
 * relationships, cohérence des durées) s'exécutent à chaque run, et le job
 * échoue explicitement si l'un d'eux casse plutôt que de publier une donnée
 * silencieusement fausse. Voir packages/dbt-analytics/README.md.
 */
export async function refreshMaterializedViews(): Promise<void> {
  const runDbtScript = path.resolve(__dirname, '..', '..', '..', 'scripts', 'run-dbt.js');

  await new Promise<void>((resolve, reject) => {
    const child = spawn('node', [runDbtScript, 'build', '--select', 'marts.dataviz'], {
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`dbt build a échoué (code ${code})`));
    });
    child.on('error', reject);
  });
}

/**
 * Nettoie les notifications lues de plus de 30 jours.
 *
 * Exécution hebdomadaire recommandée.
 *
 * @returns Nombre de notifications supprimées
 */
export async function cleanOldNotifications(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const result = await prisma.notifications.deleteMany({
    where: {
      lu: true,
      created_at: { lt: cutoff },
    },
  });

  return result.count;
}

/**
 * Nettoie les notifications non lues de plus de 90 jours (obsolètes).
 *
 * Exécution mensuelle recommandée.
 *
 * @returns Nombre de notifications supprimées
 */
export async function cleanStaleNotifications(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const result = await prisma.notifications.deleteMany({
    where: {
      lu: false,
      created_at: { lt: cutoff },
    },
  });

  return result.count;
}

export function getCronRepeatJobs() {
  return [
    {
      name: 'daily-sync-new-episodes',
      data: {},
      options: {
        jobId: 'daily-sync-new-episodes',
        repeat: { cron: '0 2 * * *' },
        removeOnComplete: true,
        removeOnFail: true,
      } as JobsOptions,
    },
    {
      name: 'weekly-resync-changes',
      data: {},
      options: {
        jobId: 'weekly-resync-changes',
        repeat: { cron: '0 3 * * 1' },
        removeOnComplete: true,
        removeOnFail: true,
      } as JobsOptions,
    },
    {
      name: 'refresh-materialized-views',
      data: {},
      options: {
        jobId: 'refresh-materialized-views',
        repeat: { cron: '0 4 * * *' },
        removeOnComplete: true,
        removeOnFail: true,
      } as JobsOptions,
    },
    {
      name: 'clean-notifications',
      data: {},
      options: {
        jobId: 'clean-notifications',
        repeat: { cron: '0 4 * * 0' },
        removeOnComplete: true,
        removeOnFail: true,
      } as JobsOptions,
    },
    {
      name: 'check-followed-persons',
      data: {},
      options: {
        jobId: 'check-followed-persons',
        repeat: { cron: '30 2 * * *' },
        removeOnComplete: true,
        removeOnFail: true,
      } as JobsOptions,
    },
    {
      name: 'check-followed-studios',
      data: {},
      options: {
        jobId: 'check-followed-studios',
        repeat: { cron: '45 2 * * *' },
        removeOnComplete: true,
        removeOnFail: true,
      } as JobsOptions,
    },
    {
      name: 'check-festival-selections',
      data: {},
      options: {
        jobId: 'check-festival-selections',
        repeat: { cron: '15 3 * * *' },
        removeOnComplete: true,
        removeOnFail: true,
      } as JobsOptions,
    },
  ];
}

export function createImportQueue(redisUrl: string) {
  return new Queue(IMPORT_QUEUE_NAME, {
    connection: buildRedisConnection(redisUrl),
  });
}

export function createCronQueue(redisUrl: string) {
  return new Queue(CRON_QUEUE_NAME, {
    connection: buildRedisConnection(redisUrl),
  });
}

export function createImportWorker(redisUrl: string) {
  const connection = buildRedisConnection(redisUrl);
  new JobScheduler(IMPORT_QUEUE_NAME, { connection });

  return new Worker(
    IMPORT_QUEUE_NAME,
    async (job) => {
      const data = job.data as ImportJobData;

      switch (data.type) {
        case 'import-title':
          return importTitleByTmdbId(data.tmdb_id, data.title_type);
        case 'import-seasons':
          return importSeasonsForSerie(data.title_id);
        case 'refresh-title':
          return refreshTitleData(data.title_id);
        default:
          throw new Error(`Unsupported import job type: ${(data as any).type}`);
      }
    },
    {
      connection,
      concurrency: DEFAULT_WORKER_CONCURRENCY,
      lockDuration: 600_000,
      // Défaut BullMQ (5s) trop agressif pour un free tier Redis facturé à
      // la commande (Upstash) — rien ici n'est urgent à la seconde près.
      drainDelay: 30,
      // Idem pour la vérification des jobs "stalled" (défaut 30s) : avec un
      // lockDuration déjà d'au moins 10 min sur ces workers, un stall
      // détecté 5 min plus tard au lieu de 30s plus tard ne change rien en
      // pratique, et divise par 10 le coût Redis de fond (perf(worker)
      // 565dfc3 avait déjà traité drainDelay mais pas ce deuxième minuteur).
      stalledInterval: 300_000,
    },
  );
}

export function createCronWorker(redisUrl: string) {
  const connection = buildRedisConnection(redisUrl);
  new JobScheduler(CRON_QUEUE_NAME, { connection });

  return new Worker(
    CRON_QUEUE_NAME,
    async (job) => {
      const data = job.data as CronJobData;

      switch (data.type) {
        case 'daily-sync-new-episodes': {
          const result = await dailySyncNewEpisodes();
          console.log(
            `Sync quotidien : ${result.titlesRefreshed} titres, ${result.notificationsCreated} notifications`,
          );
          return result;
        }
        case 'generate-notifications': {
          const count = await generateNewEpisodeNotifications();
          console.log(`Notifications générées : ${count}`);
          return { notificationsCreated: count };
        }
        case 'weekly-resync-changes': {
          const { startDate, endDate } = data;
          if (startDate && endDate) {
            return weeklyResyncChanges(startDate, endDate);
          }
          const range = getWeeklyResyncRange();
          return weeklyResyncChanges(range.startDate, range.endDate);
        }
        case 'refresh-materialized-views':
          return refreshMaterializedViews();
        case 'clean-notifications': {
          const oldDeleted = await cleanOldNotifications();
          const staleDeleted = await cleanStaleNotifications();
          console.log(
            `Nettoyage notifications : ${oldDeleted} lues (>30j) + ${staleDeleted} non lues (>90j) supprimées`,
          );
          return {
            old_notifications_deleted: oldDeleted,
            stale_notifications_deleted: staleDeleted,
          };
        }
        case 'check-followed-persons': {
          const result = await checkFollowedPersonsForNewTitles();
          console.log(`Personnes suivies : ${result.titlesAdded} ajouts à des watchlists`);
          return result;
        }
        case 'check-followed-studios': {
          const result = await checkFollowedStudiosForNewTitles();
          console.log(`Studios suivis : ${result.titlesNotified} nouveaux titres notifiés`);
          return result;
        }
        case 'check-festival-selections': {
          const result = await checkFestivalSelections();
          console.log(`Sélections de festivals : ${result.editionsNotified} éditions notifiées`);
          return result;
        }
        default:
          throw new Error(`Unsupported cron job type: ${(data as any).type}`);
      }
    },
    {
      connection,
      concurrency: 1,
      lockDuration: 600_000,
      drainDelay: 30,
      stalledInterval: 300_000,
    },
  );
}

export async function ensureRepeatableCronJobs(cronQueue: Queue) {
  const repeatJobs = getCronRepeatJobs();

  for (const job of repeatJobs) {
    await cronQueue.add(job.name, job.data, job.options);
  }
}
