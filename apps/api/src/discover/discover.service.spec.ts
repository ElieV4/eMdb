import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoverService } from './discover.service';

const mockGetTrending = jest.fn();
const mockGetDiscoverMovie = jest.fn();
const mockGetDiscoverTv = jest.fn();

jest.mock('@emdb/tmdb-client', () => ({
  getTrending: (...args: any[]) => mockGetTrending(...args),
  getDiscoverMovie: (...args: any[]) => mockGetDiscoverMovie(...args),
  getDiscoverTv: (...args: any[]) => mockGetDiscoverTv(...args),
}));

const mockPrismaService = {
  titles: { findMany: jest.fn() },
};

describe('DiscoverService', () => {
  let service: DiscoverService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.titles.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoverService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<DiscoverService>(DiscoverService);
  });

  describe('populaires — appreciesFr', () => {
    it('ajoute with_original_language=fr aux appels TMDB discover quand actif', async () => {
      mockGetDiscoverMovie.mockResolvedValue({ results: [] });
      mockGetDiscoverTv.mockResolvedValue({ results: [] });

      await service.getModule('populaires', 10, true);

      expect(mockGetDiscoverMovie).toHaveBeenCalledWith(
        expect.objectContaining({ with_original_language: 'fr' }),
      );
      expect(mockGetDiscoverTv).toHaveBeenCalledWith(
        expect.objectContaining({ with_original_language: 'fr' }),
      );
    });

    it("n'ajoute pas le paramètre quand le filtre est inactif", async () => {
      mockGetDiscoverMovie.mockResolvedValue({ results: [] });
      mockGetDiscoverTv.mockResolvedValue({ results: [] });

      await service.getModule('populaires', 10, false);

      expect(mockGetDiscoverMovie).toHaveBeenCalledWith(
        expect.not.objectContaining({ with_original_language: expect.anything() }),
      );
    });
  });

  describe('tendances — appreciesFr', () => {
    it('filtre les résultats trending sur original_language=fr côté serveur', async () => {
      mockGetTrending.mockImplementation((mediaType: string) => {
        if (mediaType === 'movie') {
          return Promise.resolve({
            results: [
              { id: 1, title: 'Film FR', original_language: 'fr', popularity: 10 },
              { id: 2, title: 'Film US', original_language: 'en', popularity: 50 },
            ],
          });
        }
        return Promise.resolve({ results: [] });
      });

      const result = await service.getModule('tendances', 10, true);

      expect(result).toHaveLength(1);
      expect(result[0].tmdb_id).toBe(1);
    });

    it('ne filtre rien quand le filtre est inactif', async () => {
      mockGetTrending.mockImplementation((mediaType: string) => {
        if (mediaType === 'movie') {
          return Promise.resolve({
            results: [
              { id: 1, title: 'Film FR', original_language: 'fr', popularity: 10 },
              { id: 2, title: 'Film US', original_language: 'en', popularity: 50 },
            ],
          });
        }
        return Promise.resolve({ results: [] });
      });

      const result = await service.getModule('tendances', 10, false);

      expect(result).toHaveLength(2);
    });
  });
});
