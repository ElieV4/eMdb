import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  TRAKT_IMPORT_QUEUE_NAME,
  CREDITS_IMPORT_QUEUE_NAME,
  buildRedisConnection,
} from './import.config';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private queues = new Map<string, Queue>();

  constructor(private readonly configService: ConfigService) {}

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
  async startCreditsImport(userId: string): Promise<{ jobId: string | undefined; status: string }> {
    const queue = this.getQueue(CREDITS_IMPORT_QUEUE_NAME);

    this.logger.log(`Ajout d'un job credits-import pour l'utilisateur ${userId}`);

    const job = await queue.add(
      'credits-import',
      { userId },
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
