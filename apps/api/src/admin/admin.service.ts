import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { CRON_QUEUE_NAME, buildRedisConnection } from './bullmq.config';
import { WorkerManagerService, WorkerStatus } from './worker-manager.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';

/**
 * Service admin – Phase 6.2
 *
 * Responsable de l'ajout de jobs à la queue BullMQ `tmdb-cron`
 * pour le rafraîchissement des vues matérialisées.
 *
 * La queue `tmdb-cron` existe déjà dans apps/worker/src/worker.ts
 * et le worker `createCronWorker` traite déjà le job `refresh-materialized-views`.
 * Ce service se contente d'y ajouter un job depuis l'API.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private cronQueue: Queue | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly listsService: ListsService,
    private readonly workerManager: WorkerManagerService,
  ) {}

  /**
   * Retourne (et cache) une instance de Queue BullMQ pointant sur la
   * queue `tmdb-cron` existante.
   */
  private getCronQueue(): Queue {
    if (!this.cronQueue) {
      const redisUrl = this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
      const connection = buildRedisConnection(redisUrl);
      this.cronQueue = new Queue(CRON_QUEUE_NAME, { connection });
    }
    return this.cronQueue;
  }

  /**
   * Ajoute un job de rafraîchissement des vues matérialisées à la queue
   * `tmdb-cron`. Le worker le traitera dès que possible.
   *
   * @returns Les infos du job créé (jobId, status)
   */
  async refreshMaterializedViews(): Promise<{
    jobId: string | undefined;
    status: string;
    message: string;
  }> {
    const queue = this.getCronQueue();

    this.logger.log('Ajout d’un job refresh-materialized-views à la queue tmdb-cron');

    const job = await queue.add(
      'refresh-materialized-views',
      { type: 'refresh-materialized-views' },
      {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10_000,
        },
      },
    );

    this.logger.log(`Job refresh-materialized-views créé : jobId=${job.id}`);

    return {
      jobId: job.id,
      status: 'queued',
      message: 'Rafraîchissement des vues matérialisées planifié',
    };
  }

  /**
   * Liste des comptes en attente de validation (inscriptions non traitées),
   * les plus anciens en premier.
   */
  async listAccountRequests() {
    return this.prisma.users.findMany({
      where: { status: 'pending' },
      select: { id: true, email: true, pseudo: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });
  }

  private async findPendingUserOrThrow(userId: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'pending') {
      throw new NotFoundException('Demande de compte introuvable.');
    }
    return user;
  }

  /**
   * Approuve une demande de création de compte : passe le statut à 'active'
   * et crée les listes par défaut (Ma Watchlist / Mes Favoris), comme le
   * faisait l'ancien flux d'inscription immédiate.
   */
  async approveAccountRequest(userId: string) {
    await this.findPendingUserOrThrow(userId);

    await this.prisma.users.update({ where: { id: userId }, data: { status: 'active' } });

    await Promise.all([
      this.listsService.createList(userId, {
        nom: 'Ma Watchlist',
        type: 'watchlist',
        description: 'Films et séries à voir',
      }),
      this.listsService.createList(userId, {
        nom: 'Mes Favoris',
        type: 'favoris',
        description: 'Mes titres préférés',
      }),
    ]);

    return { success: true };
  }

  /**
   * Refuse une demande de création de compte : passe le statut à 'rejected'
   * (le login reste bloqué, définitivement).
   */
  async rejectAccountRequest(userId: string) {
    await this.findPendingUserOrThrow(userId);

    await this.prisma.users.update({ where: { id: userId }, data: { status: 'rejected' } });

    return { success: true };
  }

  /**
   * Statut courant du worker BullMQ embarqué (process enfant, cf.
   * WorkerManagerService). `embedEnabled` reflète EMBED_WORKER, `running`
   * l'état réel du process, `paused` si une pause manuelle a été demandée.
   */
  getWorkerStatus(): WorkerStatus {
    return this.workerManager.getStatus();
  }

  /**
   * Coupe le worker embarqué (tue le process enfant → connexion Redis
   * fermée) sans toucher au reste de l'API. Utile en urgence quand le
   * quota Upstash (500k commandes Redis/mois) approche de sa limite.
   */
  pauseWorker(): WorkerStatus {
    return this.workerManager.pause();
  }

  /** Relance le worker embarqué après une pause manuelle. */
  resumeWorker(): WorkerStatus {
    return this.workerManager.resume();
  }
}
