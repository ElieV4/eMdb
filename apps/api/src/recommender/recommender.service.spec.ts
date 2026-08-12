import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RecommenderService } from './recommender.service';
import { Queue } from 'bullmq';

const mockQueueAdd = jest.fn();
const mockQueueGetJob = jest.fn();
const mockQueueGetJobs = jest.fn();

const mockPrismaService = {
  $queryRawUnsafe: jest.fn(),
  user_ratings: { findMany: jest.fn() },
  user_watches: { findMany: jest.fn() },
  title_recommendations: { findMany: jest.fn() },
  titles: { findMany: jest.fn() },
};

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockQueueAdd,
    getJob: mockQueueGetJob,
    getJobs: mockQueueGetJobs,
    close: jest.fn(),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    status: 'ready',
    on: jest.fn(),
  }));
});

describe('RecommenderService', () => {
  let service: RecommenderService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.$queryRawUnsafe.mockReset();
    mockPrismaService.user_ratings.findMany.mockReset();
    mockPrismaService.user_watches.findMany.mockReset();
    mockPrismaService.title_recommendations.findMany.mockReset();
    mockPrismaService.titles.findMany.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommenderService,
        { provide: ConfigService, useValue: { get: jest.fn(() => 'redis://localhost:6379') } },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RecommenderService>(RecommenderService);
  });

  describe('startRecommendations', () => {
    it('ajoute un job à la queue recommendations et retourne jobId', async () => {
      const mockJob = { id: 'job-123' };
      mockQueueAdd.mockResolvedValue(mockJob);

      const result = await service.startRecommendations('all');

      expect(result).toEqual({
        jobId: 'job-123',
        status: 'queued',
        message: 'Calcul des recommandations planifié',
      });

      expect(Queue).toHaveBeenCalledWith('recommendations', {
        connection: expect.any(Object),
      });

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'compute-recommendations',
        { mode: 'all' },
        expect.objectContaining({
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 0,
        }),
      );
    });

    it('utilise le mode titles', async () => {
      mockQueueAdd.mockResolvedValue({ id: 'job-456' });

      await service.startRecommendations('titles');

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'compute-recommendations',
        { mode: 'titles' },
        expect.any(Object),
      );
    });
  });

  describe('getUserRecommendations', () => {
    it('agrège les recommandations pondérées par la note, exclut les titres déjà vus/notés', async () => {
      mockPrismaService.user_ratings.findMany
        .mockResolvedValueOnce([{ title_id: 'source-1', note_perso: 8 }])
        .mockResolvedValueOnce([{ title_id: 'source-1' }]);
      mockPrismaService.user_watches.findMany.mockResolvedValueOnce([{ title_id: 'watched-1' }]);
      mockPrismaService.title_recommendations.findMany.mockResolvedValue([
        { title_id: 'source-1', recommended_id: 'rec-1', score: 0.8 },
        { title_id: 'source-1', recommended_id: 'watched-1', score: 0.9 },
      ]);
      mockPrismaService.titles.findMany.mockResolvedValue([
        { id: 'rec-1', titre_vo: 'Film Un', title_countries: [] },
      ]);

      const result = await service.getUserRecommendations('user-1', { limit: 10 });

      expect(result).toEqual([{ id: 'rec-1', titre_vo: 'Film Un', title_countries: [] }]);
      expect(mockPrismaService.title_recommendations.findMany).toHaveBeenCalledWith({
        where: { title_id: { in: ['source-1'] } },
        select: { title_id: true, recommended_id: true, score: true },
      });
    });

    it("retombe sur les titres vus si l'utilisateur n'a aucune note", async () => {
      mockPrismaService.user_ratings.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaService.user_watches.findMany
        .mockResolvedValueOnce([{ title_id: 'watched-1' }])
        .mockResolvedValueOnce([{ title_id: 'watched-1' }]);
      mockPrismaService.title_recommendations.findMany.mockResolvedValue([
        { title_id: 'watched-1', recommended_id: 'rec-2', score: 0.5 },
      ]);
      mockPrismaService.titles.findMany.mockResolvedValue([
        { id: 'rec-2', titre_vo: 'Film Deux', title_countries: [] },
      ]);

      const result = await service.getUserRecommendations('user-1', { limit: 10 });

      expect(result).toEqual([{ id: 'rec-2', titre_vo: 'Film Deux', title_countries: [] }]);
    });

    it("retourne un tableau vide si l'utilisateur n'a ni note ni visionnage", async () => {
      mockPrismaService.user_ratings.findMany.mockResolvedValueOnce([]);
      mockPrismaService.user_watches.findMany.mockResolvedValueOnce([]);

      const result = await service.getUserRecommendations('user-1', { limit: 10 });

      expect(result).toEqual([]);
      expect(mockPrismaService.title_recommendations.findMany).not.toHaveBeenCalled();
    });

    it('booste les titres francophones (FR/BE/CH) quand appreciesFr est actif', async () => {
      mockPrismaService.user_ratings.findMany
        .mockResolvedValueOnce([{ title_id: 'source-1', note_perso: 10 }])
        .mockResolvedValueOnce([]);
      mockPrismaService.user_watches.findMany.mockResolvedValueOnce([]);
      mockPrismaService.title_recommendations.findMany.mockResolvedValue([
        { title_id: 'source-1', recommended_id: 'rec-fr', score: 0.5 },
        { title_id: 'source-1', recommended_id: 'rec-us', score: 0.6 },
      ]);
      mockPrismaService.titles.findMany.mockResolvedValue([
        { id: 'rec-fr', titre_vo: 'Film FR', title_countries: [{ countries: { code: 'FR' } }] },
        { id: 'rec-us', titre_vo: 'Film US', title_countries: [{ countries: { code: 'US' } }] },
      ]);

      const result = await service.getUserRecommendations('user-1', {
        limit: 10,
        appreciesFr: true,
      });

      // rec-us (score brut 0.6) devance normalement rec-fr (0.5), mais le
      // boost France (x1.3 = 0.65) doit le faire remonter en tête.
      expect(result.map((t: any) => t.id)).toEqual(['rec-fr', 'rec-us']);
    });
  });

  describe('getJobStatus', () => {
    it('retourne not_found si le job n existe pas', async () => {
      mockQueueGetJob.mockResolvedValue(null);

      const result = await service.getJobStatus('unknown-job');

      expect(result).toEqual({
        jobId: 'unknown-job',
        status: 'not_found',
      });
    });

    it('retourne le statut complet du job', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('completed'),
        progress: 100,
        returnvalue: { titlesComputed: 500, peopleComputed: 200 },
        processedOn: 1000000,
        finishedOn: 1000500,
      };
      mockQueueGetJob.mockResolvedValue(mockJob);

      const result = await service.getJobStatus('job-123');

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.result).toEqual({ titlesComputed: 500, peopleComputed: 200 });
      expect(result.duration_ms).toBe(500000);
    });
  });
});
