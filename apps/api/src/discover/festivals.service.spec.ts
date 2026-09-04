import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoverService } from './discover.service';
import { FestivalsService } from './festivals.service';

const mockGetRecentEditions = jest.fn();
const mockGetEditionSelection = jest.fn();

jest.mock('@emdb/wikidata-client', () => ({
  getRecentEditions: (...args: any[]) => mockGetRecentEditions(...args),
  getEditionSelection: (...args: any[]) => mockGetEditionSelection(...args),
}));

const mockGetMovieDetails = jest.fn();
const mockGetTvDetails = jest.fn();

jest.mock('@emdb/tmdb-client', () => ({
  getMovieDetails: (...args: any[]) => mockGetMovieDetails(...args),
  getTvDetails: (...args: any[]) => mockGetTvDetails(...args),
}));

const mockPrismaService = {
  titles: { findMany: jest.fn() },
};

describe('FestivalsService', () => {
  let service: FestivalsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.titles.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FestivalsService,
        DiscoverService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FestivalsService>(FestivalsService);
  });

  describe('getEditions', () => {
    it('délègue à getRecentEditions du client Wikidata', async () => {
      const editions = [{ sourceQid: 'Q42369', editionId: 'Q1', annee: 2026 }];
      mockGetRecentEditions.mockResolvedValue(editions);

      const result = await service.getEditions();

      expect(result).toBe(editions);
    });
  });

  describe('getSelection', () => {
    it('enrichit chaque nommé via TMDB et conserve catégorie/gagnant', async () => {
      mockGetEditionSelection.mockResolvedValue([
        { tmdbId: 803700, tmdbType: 'film', titre: 'Les Huit Montagnes', categorie: "Palme d'or", gagnant: false },
      ]);
      mockGetMovieDetails.mockResolvedValue({
        title: 'Les Huit Montagnes',
        original_title: 'Le otto montagne',
        release_date: '2022-05-19',
        poster_path: '/poster.jpg',
        vote_average: 7.8,
      });

      const result = await service.getSelection('Q107526152');

      expect(result).toEqual([
        expect.objectContaining({
          tmdb_id: 803700,
          titre_vf: 'Les Huit Montagnes',
          categorie: "Palme d'or",
          gagnant: false,
          local: false,
        }),
      ]);
      expect(mockGetMovieDetails).toHaveBeenCalledWith(803700);
    });

    it('omet un nommé si TMDB échoue pour son id (id périmé)', async () => {
      mockGetEditionSelection.mockResolvedValue([
        { tmdbId: 999999, tmdbType: 'film', titre: 'Introuvable', categorie: null, gagnant: false },
      ]);
      mockGetMovieDetails.mockRejectedValue(new Error('404'));

      const result = await service.getSelection('Q107526152');

      expect(result).toEqual([]);
    });

    it('préserve la catégorie propre à chaque occurrence quand un même titre en a plusieurs', async () => {
      mockGetEditionSelection.mockResolvedValue([
        { tmdbId: 803700, tmdbType: 'film', titre: 'X', categorie: "Palme d'or", gagnant: false },
        { tmdbId: 803700, tmdbType: 'film', titre: 'X', categorie: 'Prix du jury', gagnant: true },
      ]);
      mockGetMovieDetails.mockResolvedValue({ title: 'X', release_date: '2022-01-01' });

      const result = await service.getSelection('Q107526152');

      expect(result.map((r) => r.categorie)).toEqual(["Palme d'or", 'Prix du jury']);
      expect(result.map((r) => r.gagnant)).toEqual([false, true]);
    });
  });
});
