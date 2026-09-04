import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RECOMMENDATIONS_QUEUE_NAME, buildRedisConnection } from './recommender.config';

export type RecomputeMode = 'titles' | 'people' | 'all';

@Injectable()
export class RecommenderService {
  private readonly logger = new Logger(RecommenderService.name);
  private queue: Queue | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getQueue(): Queue {
    if (!this.queue) {
      const redisUrl = this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
      this.queue = new Queue(RECOMMENDATIONS_QUEUE_NAME, {
        connection: buildRedisConnection(redisUrl),
      });
    }
    return this.queue;
  }

  async startRecommendations(mode: RecomputeMode = 'all'): Promise<{
    jobId: string | undefined;
    status: string;
    message: string;
  }> {
    const queue = this.getQueue();
    this.logger.log(
      `Ajout d'un job compute-recommendations à la queue ${RECOMMENDATIONS_QUEUE_NAME}`,
    );

    const job = await queue.add(
      'compute-recommendations',
      { mode },
      {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 0,
      },
    );

    this.logger.log(`Job compute-recommendations créé : jobId=${job.id}`);

    return {
      jobId: job.id,
      status: 'queued',
      message: 'Calcul des recommandations planifié',
    };
  }

  async getJobStatus(jobId: string) {
    const queue = this.getQueue();
    const job = await queue.getJob(jobId);

    if (!job) {
      return {
        jobId,
        status: 'not_found',
      };
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const processedOn = job.processedOn;
    const finishedOn = job.finishedOn;

    let durationMs: number | null = null;
    if (processedOn && finishedOn) {
      durationMs = (finishedOn - processedOn) * 1000;
    }

    const response: Record<string, any> = {
      jobId: job.id!,
      status: state,
      progress,
      duration_ms: durationMs,
    };

    if (result) {
      response.result = result;
    }

    return response;
  }

  async getStats() {
    const [totalTitleRecs, totalPersonRecs, titlesWithRecs, peopleWithRecs] = await Promise.all([
      this.countTitleRecommendations(),
      this.countPersonRecommendations(),
      this.countTitlesWithRecs(),
      this.countPeopleWithRecs(),
    ]);

    const lastRun = await this.getLastRun();

    return {
      total_title_recommendations: totalTitleRecs,
      total_person_recommendations: totalPersonRecs,
      titles_with_recs: titlesWithRecs,
      people_with_recs: peopleWithRecs,
      last_run: lastRun,
    };
  }

  private async countTitleRecommendations(): Promise<number> {
    const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(*) as count FROM title_recommendations',
    );
    return Number(result[0]?.count ?? 0);
  }

  private async countPersonRecommendations(): Promise<number> {
    const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(*) as count FROM person_recommendations',
    );
    return Number(result[0]?.count ?? 0);
  }

  private async countTitlesWithRecs(): Promise<number> {
    const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(DISTINCT title_id) as count FROM title_recommendations',
    );
    return Number(result[0]?.count ?? 0);
  }

  private async countPeopleWithRecs(): Promise<number> {
    const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(DISTINCT person_id) as count FROM person_recommendations',
    );
    return Number(result[0]?.count ?? 0);
  }

  /**
   * Recommandations personnalisées pour un utilisateur — agrège les
   * recommandations par-titre déjà calculées (`title_recommendations`,
   * similarité genres/casting/réalisateur/sujet/date) pour les titres
   * regardés RÉCEMMENT par l'utilisateur, pondérées par sa note quand il y
   * en a une. Un titre récent mais mal noté (note_perso < 5) est exclu de
   * la source : une mauvaise note signale explicitement "ne me recommande
   * pas des choses similaires à ça", contrairement à l'absence de note qui
   * ne signale rien de particulier. Exclut des RÉSULTATS tous les titres
   * déjà vus ou notés (pas de sens à recommander ce qui est déjà connu).
   *
   * `appreciesFr` applique un boost (pas un filtre dur) aux titres dont un
   * pays de production est FR/BE/CH — un filtre dur réduirait trop souvent
   * le nombre de résultats disponibles vu le peu de données par utilisateur.
   * Approximation : la BDD n'a pas de colonne "langue d'origine" par titre,
   * seulement les pays de production (table title_countries).
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param options.limit - Nombre de titres à retourner (défaut 20)
   * @param options.appreciesFr - Applique le boost France
   */
  async getUserRecommendations(
    userId: string,
    options: { limit?: number; appreciesFr?: boolean } = {},
  ) {
    const limit = options.limit ?? 20;
    const POOR_RATING_THRESHOLD = 5;

    const recentWatches = await this.prisma.user_watches.findMany({
      where: { user_id: userId, title_id: { not: null } },
      select: { title_id: true },
      distinct: ['title_id'],
      orderBy: { date_vue: 'desc' },
      take: 30,
    });

    if (recentWatches.length === 0) {
      return [];
    }

    const recentTitleIds = recentWatches.map((w) => w.title_id as string);
    const ratingsForRecent = await this.prisma.user_ratings.findMany({
      where: { user_id: userId, title_id: { in: recentTitleIds } },
      select: { title_id: true, note_perso: true },
    });
    const noteByTitleId = new Map(
      ratingsForRecent.map((r) => [r.title_id as string, Number(r.note_perso)]),
    );

    const sourceTitles: { titleId: string; weight: number }[] = recentTitleIds
      .filter((id) => (noteByTitleId.get(id) ?? Infinity) >= POOR_RATING_THRESHOLD)
      .map((id) => ({
        titleId: id,
        weight: noteByTitleId.has(id) ? noteByTitleId.get(id)! / 10 : 1,
      }));

    if (sourceTitles.length === 0) {
      return [];
    }

    const [watchedRows, ratedRows] = await Promise.all([
      this.prisma.user_watches.findMany({
        where: { user_id: userId, title_id: { not: null } },
        select: { title_id: true },
        distinct: ['title_id'],
      }),
      this.prisma.user_ratings.findMany({
        where: { user_id: userId, title_id: { not: null } },
        select: { title_id: true },
      }),
    ]);
    const excludeIds = new Set<string>([
      ...watchedRows.map((w) => w.title_id as string),
      ...ratedRows.map((r) => r.title_id as string),
    ]);

    const weightByTitleId = new Map(sourceTitles.map((s) => [s.titleId, s.weight]));
    const recs = await this.prisma.title_recommendations.findMany({
      where: { title_id: { in: sourceTitles.map((s) => s.titleId) } },
      select: { title_id: true, recommended_id: true, score: true },
    });

    const aggregated = new Map<string, number>();
    for (const rec of recs) {
      if (excludeIds.has(rec.recommended_id)) continue;
      const weight = weightByTitleId.get(rec.title_id) ?? 1;
      const contribution = Number(rec.score) * weight;
      aggregated.set(rec.recommended_id, (aggregated.get(rec.recommended_id) ?? 0) + contribution);
    }

    if (aggregated.size === 0) {
      return [];
    }

    // Sur-échantillonne avant le boost France : le tri final peut faire
    // remonter des candidats hors du top brut une fois le boost appliqué.
    const candidateIds = [...aggregated.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit * 3)
      .map(([id]) => id);

    const titleRows = await this.prisma.titles.findMany({
      where: { id: { in: candidateIds } },
      include: {
        title_genres: { include: { genres: { select: { id: true, nom: true } } } },
        title_countries: { include: { countries: { select: { id: true, code: true, nom: true } } } },
        // Nombre total d'épisodes (hors saison 0/spéciaux) affiché sur les
        // cards série de la page Recommandations — sommé depuis le compte
        // par saison, cf. lists.service.ts#getListDetail (même pattern).
        seasons: {
          where: { numero: { not: 0 } },
          select: { _count: { select: { episodes: true } } },
        },
      },
    });

    const FRENCH_COUNTRY_CODES = new Set(['FR', 'BE', 'CH']);

    const scored = titleRows.map((title) => {
      let score = aggregated.get(title.id) ?? 0;
      if (options.appreciesFr) {
        const isFrench = title.title_countries.some((tc) =>
          FRENCH_COUNTRY_CODES.has(tc.countries.code),
        );
        if (isFrench) score *= 1.3;
      }
      return { title, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => ({
      ...s.title,
      nombre_episodes:
        s.title.type === 'serie'
          ? s.title.seasons.reduce((sum, se) => sum + se._count.episodes, 0)
          : undefined,
    }));
  }

  private async getLastRun() {
    const queue = this.getQueue();
    const jobs = await queue.getJobs(['completed', 'failed'], 0, 0);
    if (jobs.length === 0) return null;

    const lastJob = jobs[0];
    return {
      started_at: lastJob.processedOn ? new Date(lastJob.processedOn * 1000).toISOString() : null,
      completed_at: lastJob.finishedOn ? new Date(lastJob.finishedOn * 1000).toISOString() : null,
      duration_ms:
        lastJob.processedOn && lastJob.finishedOn
          ? (lastJob.finishedOn - lastJob.processedOn) * 1000
          : null,
      status: lastJob.returnvalue ? 'completed' : 'failed',
      titles_computed: (lastJob.returnvalue as any)?.titlesComputed ?? null,
      people_computed: (lastJob.returnvalue as any)?.peopleComputed ?? null,
    };
  }
}
