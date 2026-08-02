import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { TRAKT_IMPORT_QUEUE_NAME, buildRedisConnection } from './import.config';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private queue: Queue | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getQueue(): Queue {
    if (!this.queue) {
      const redisUrl = this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
      this.queue = new Queue(TRAKT_IMPORT_QUEUE_NAME, { connection: buildRedisConnection(redisUrl) });
    }
    return this.queue;
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
  async startTraktImport(userId: string, extractDir: string): Promise<{ jobId: string | undefined; status: string }> {
    const queue = this.getQueue();

    this.logger.log(`Ajout d'un job trakt-import pour l'utilisateur ${userId}`);

    const job = await queue.add(
      'trakt-import',
      { userId, extractDir },
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
    const queue = this.getQueue();
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
