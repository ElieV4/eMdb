import * as fs from 'node:fs';
import * as path from 'node:path';
import { Worker, Job } from 'bullmq';
import { prisma } from '@emdb/db';
import { importCreditsForTitle } from '@emdb/tmdb-sync';
import { buildRedisConnection } from './worker';

export type CreditsImportJobData = {
  userId: string;
  /** Rôles à importer — cf. CREDIT_FILTER pour la valeur par défaut. */
  creditRoles?: string[];
  /** Nombre max d'acteurs importés par titre (undefined = illimité). */
  maxCast?: number;
};

export type CreditsImportProgress = {
  imported: number;
  total: number;
};

export type CreditsImportResult = {
  creditsImported: number;
  creditsFailed: number;
  titlesProcessed: number;
};

export const CREDITS_IMPORT_QUEUE_NAME = 'credits-import';

const CREDIT_FILTER = ['acteur', 'realisateur'];
const BATCH_SIZE = 100;
const CREDITS_THRESHOLD = 10;

async function filterTitlesMissingCredits<T extends { titleId: string }>(titles: T[]): Promise<T[]> {
  if (titles.length === 0) return titles;

  const counts = await prisma.credits.groupBy({
    by: ['title_id'],
    where: { title_id: { in: titles.map((t) => t.titleId) } },
    _count: { id: true },
  });
  const countByTitleId = new Map(counts.map((c) => [c.title_id, c._count.id]));

  return titles.filter((t) => (countByTitleId.get(t.titleId) ?? 0) < CREDITS_THRESHOLD);
}

async function getUserTitlesByYear(userId: string) {
  const [watches, ratings, listItems] = await Promise.all([
    prisma.user_watches.findMany({
      where: { user_id: userId },
      select: {
        title_id: true,
        episode_id: true,
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            type: true,
            titre_vf: true,
            titre_vo: true,
          },
        },
      },
    }),
    prisma.user_ratings.findMany({
      where: { user_id: userId },
      select: {
        title_id: true,
        episode_id: true,
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            type: true,
            titre_vf: true,
            titre_vo: true,
          },
        },
      },
    }),
    prisma.list_items.findMany({
      where: {
        user_lists: {
          user_id: userId,
        },
      },
      select: {
        title_id: true,
        user_lists: {
          select: {
            created_at: true,
          },
        },
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            type: true,
            titre_vf: true,
            titre_vo: true,
          },
        },
      },
    }),
  ]);

  const titleMap = new Map<string, { tmdbId: number; type: string; titre: string }>();

  for (const watch of watches) {
    if (!watch.titles || !watch.titles.tmdb_id) continue;
    const titleId = watch.title_id || watch.episode_id;
    if (!titleId) continue;
    if (!titleMap.has(titleId)) {
      titleMap.set(titleId, {
        tmdbId: watch.titles.tmdb_id,
        type: watch.titles.type,
        titre: watch.titles.titre_vf ?? watch.titles.titre_vo,
      });
    }
  }

  for (const rating of ratings) {
    if (!rating.titles || !rating.titles.tmdb_id) continue;
    const titleId = rating.title_id || rating.episode_id;
    if (!titleId) continue;
    if (!titleMap.has(titleId)) {
      titleMap.set(titleId, {
        tmdbId: rating.titles.tmdb_id,
        type: rating.titles.type,
        titre: rating.titles.titre_vf ?? rating.titles.titre_vo,
      });
    }
  }

  for (const item of listItems) {
    if (!item.titles || !item.titles.tmdb_id) continue;
    if (!titleMap.has(item.title_id)) {
      titleMap.set(item.title_id, {
        tmdbId: item.titles.tmdb_id,
        type: item.titles.type,
        titre: item.titles.titre_vf ?? item.titles.titre_vo,
      });
    }
  }

  return Array.from(titleMap.entries()).map(([titleId, data]) => ({
    titleId,
    tmdbId: data.tmdbId,
    type: data.type,
    titre: data.titre,
  }));
}

async function runCreditsImport(job: Job<CreditsImportJobData>): Promise<CreditsImportResult> {
  const { userId, creditRoles, maxCast } = job.data;
  const creditFilter = creditRoles?.length ? creditRoles : CREDIT_FILTER;

  const allTitles = await getUserTitlesByYear(userId);
  const titles = await filterTitlesMissingCredits(allTitles);
  const total = titles.length;
  let imported = 0;
  let failed = 0;

  await job.updateProgress({ imported: 0, total } satisfies CreditsImportProgress);

  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);

    for (const { titleId, tmdbId, titre } of batch) {
      try {
        await importCreditsForTitle(titleId, {
          creditFilter,
          maxCast,
        });
        imported++;
      } catch (e) {
        failed++;
      }
      await job.updateProgress({ imported, total } satisfies CreditsImportProgress);
    }

    if (i + BATCH_SIZE < titles.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return {
    creditsImported: imported,
    creditsFailed: failed,
    titlesProcessed: total,
  };
}

export function createCreditsImportWorker(redisUrl: string) {
  const connection = buildRedisConnection(redisUrl);

  return new Worker<CreditsImportJobData, CreditsImportResult>(
    CREDITS_IMPORT_QUEUE_NAME,
    (job) => runCreditsImport(job),
    {
      connection,
      concurrency: 1,
      lockDuration: 60 * 60 * 1000,
      drainDelay: 30,
      stalledInterval: 300_000,
    },
  );
}
