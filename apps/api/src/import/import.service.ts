import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  TRAKT_IMPORT_QUEUE_NAME,
  CREDITS_IMPORT_QUEUE_NAME,
  buildRedisConnection,
} from './import.config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Doit rester synchronisé avec CREDITS_THRESHOLD dans
 * apps/worker/src/credits-import.worker.ts — sert uniquement à afficher un
 * aperçu du nombre de titres concernés avant de lancer le job.
 */
const CREDITS_THRESHOLD = 10;

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private queues = new Map<string, Queue>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);
    if (!queue) {
      const redisUrl = this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
      queue = new Queue(queueName, { connection: buildRedisConnection(redisUrl) });
      this.queues.set(queueName, queue);
    }
    return queue;
  }

  /**
   * Ajoute un job d'import Trakt à la queue. `extractDir` doit déjà
   * contenir les fichiers JSON extraits de l'export (le contrôleur gère
   * l'upload/dézippage avant d'appeler cette méthode).
   *
   * `removeOnComplete`/`removeOnFail` bornés (au lieu de `true`, utilisé
   * ailleurs dans l'appli) : le frontend a besoin de pouvoir lire le
   * résultat final (stats d'import) en pollant après complétion — un job
   * retiré immédiatement de Redis à la complétion ne serait plus consultable.
   */
  async startTraktImport(
    userId: string,
    extractDir: string,
    sinceDate?: string,
  ): Promise<{ jobId: string | undefined; status: string }> {
    const queue = this.getQueue(TRAKT_IMPORT_QUEUE_NAME);

    this.logger.log(`Ajout d'un job trakt-import pour l'utilisateur ${userId}`);

    const job = await queue.add(
      'trakt-import',
      { userId, extractDir, sinceDate },
      {
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 3600 },
        attempts: 1,
      },
    );

    this.logger.log(`Job trakt-import créé : jobId=${job.id}`);

    return { jobId: job.id, status: 'queued' };
  }

  async getJobStatus(jobId: string) {
    return this.getStatus(TRAKT_IMPORT_QUEUE_NAME, jobId);
  }

  /**
   * Ajoute un job d'import de credits à la queue — même pattern que
   * `startTraktImport` (bouton "Importer les credits" de la page Profil,
   * exécuté après un import Trakt fait sans casting pour rester rapide).
   */
  async startCreditsImport(
    userId: string,
    options: { creditRoles?: string[]; maxCast?: number } = {},
  ): Promise<{ jobId: string | undefined; status: string }> {
    const queue = this.getQueue(CREDITS_IMPORT_QUEUE_NAME);

    this.logger.log(`Ajout d'un job credits-import pour l'utilisateur ${userId}`);

    const job = await queue.add(
      'credits-import',
      { userId, creditRoles: options.creditRoles, maxCast: options.maxCast },
      {
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 3600 },
        attempts: 1,
      },
    );

    this.logger.log(`Job credits-import créé : jobId=${job.id}`);

    return { jobId: job.id, status: 'queued' };
  }

  async getCreditsJobStatus(jobId: string) {
    return this.getStatus(CREDITS_IMPORT_QUEUE_NAME, jobId);
  }

  /**
   * Nombre de titres qu'un import de credits traiterait pour cet
   * utilisateur (watches/ratings/listes, avec moins de CREDITS_THRESHOLD
   * credits déjà en base) — affiché à côté du bouton "Importer les credits"
   * pour donner une idée du volume avant de lancer le job.
   */
  async getCreditsImportPreviewCount(userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM (
        SELECT t.id
        FROM (
          SELECT title_id FROM user_watches WHERE user_id = ${userId}::uuid AND title_id IS NOT NULL
          UNION
          SELECT title_id FROM user_ratings WHERE user_id = ${userId}::uuid AND title_id IS NOT NULL
          UNION
          SELECT li.title_id FROM list_items li
          JOIN user_lists ul ON ul.id = li.list_id
          WHERE ul.user_id = ${userId}::uuid
        ) ids
        JOIN titles t ON t.id = ids.title_id
        LEFT JOIN credits c ON c.title_id = t.id
        GROUP BY t.id
        HAVING COUNT(c.id) < ${CREDITS_THRESHOLD}
      ) sub
    `);

    return Number(rows[0]?.count ?? 0);
  }

  private async getStatus(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return { jobId, status: 'not_found' };
    }

    const state = await job.getState();

    return {
      jobId: job.id!,
      status: state,
      progress: job.progress ?? null,
      result: job.returnvalue ?? null,
      error: job.failedReason ?? null,
    };
  }
}
