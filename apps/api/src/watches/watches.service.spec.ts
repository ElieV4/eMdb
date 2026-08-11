import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WatchesService } from './watches.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';

jest.mock('@emdb/db', () => ({
  getSerieProgress: jest.fn(),
}));

import { getSerieProgress } from '@emdb/db';

const prismaServiceMock = {
  titles: {
    findUnique: jest.fn(),
  },
  episodes: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user_watches: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user_follows_serie: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  list_items: {
    deleteMany: jest.fn(),
  },
  user_lists: {
    findFirst: jest.fn(),
  },
};

const listsServiceMock = {
  createList: jest.fn().mockResolvedValue({ id: 'watchlist-1' }),
  addItem: jest.fn().mockResolvedValue(undefined),
};

describe('WatchesService', () => {
  let service: WatchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchesService,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: ListsService, useValue: listsServiceMock },
      ],
    }).compile();

    service = module.get<WatchesService>(WatchesService);
    jest.clearAllMocks();
  });

  const userId = 'user-uuid';
  const titleId = 'title-uuid';
  const episodeId = 'episode-uuid';
  const watchId = 'watch-uuid';

  // ======================================================================
  // createWatch
  // ======================================================================
  describe('createWatch', () => {
    it('crée un watch pour un title_id', async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue({ id: titleId });
      prismaServiceMock.user_watches.create.mockResolvedValue({
        id: watchId,
        user_id: userId,
        title_id: titleId,
        episode_id: null,
        date_vue: new Date('2026-07-23'),
      });

      const result = await service.createWatch(userId, { title_id: titleId });

      expect(result.id).toBe(watchId);
      expect(prismaServiceMock.titles.findUnique).toHaveBeenCalledWith({
        where: { id: titleId },
        select: { id: true, type: true },
      });
      expect(prismaServiceMock.user_watches.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: userId,
            title_id: titleId,
            episode_id: null,
          }),
        }),
      );
    });

    it('retire automatiquement un film de la watchlist une fois marqué vu', async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue({ id: titleId, type: 'film' });
      prismaServiceMock.user_watches.create.mockResolvedValue({ id: watchId, title_id: titleId });

      await service.createWatch(userId, { title_id: titleId });

      expect(prismaServiceMock.list_items.deleteMany).toHaveBeenCalledWith({
        where: {
          title_id: titleId,
          user_lists: { user_id: userId, type: 'watchlist' },
        },
      });
    });

    it('ne retire pas une série de la watchlist quand un visionnage est enregistré', async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue({ id: titleId, type: 'serie' });
      prismaServiceMock.user_watches.create.mockResolvedValue({ id: watchId, title_id: titleId });

      await service.createWatch(userId, { title_id: titleId });

      expect(prismaServiceMock.list_items.deleteMany).not.toHaveBeenCalled();
    });

    it('crée un watch pour un episode_id', async () => {
      prismaServiceMock.episodes.findUnique.mockResolvedValue({
        id: episodeId,
        seasons: { title_id: titleId },
      });
      prismaServiceMock.user_watches.create.mockResolvedValue({
        id: watchId,
        user_id: userId,
        title_id: null,
        episode_id: episodeId,
        date_vue: new Date('2026-07-23'),
      });

      const result = await service.createWatch(userId, { episode_id: episodeId });

      expect(result.id).toBe(watchId);
      expect(prismaServiceMock.episodes.findUnique).toHaveBeenCalledWith({
        where: { id: episodeId },
        select: { id: true, seasons: { select: { title_id: true } } },
      });
    });

    it('ajoute automatiquement la série à la watchlist quand un épisode est marqué vu (retour utilisateur)', async () => {
      prismaServiceMock.episodes.findUnique.mockResolvedValue({
        id: episodeId,
        seasons: { title_id: titleId },
      });
      prismaServiceMock.user_watches.create.mockResolvedValue({ id: watchId, episode_id: episodeId });

      await service.createWatch(userId, { episode_id: episodeId });

      expect(listsServiceMock.createList).toHaveBeenCalledWith(userId, {
        nom: 'Ma Watchlist',
        type: 'watchlist',
      });
      expect(listsServiceMock.addItem).toHaveBeenCalledWith('watchlist-1', userId, titleId);
    });

    it('utilise la date personnalisée si fournie', async () => {
      const customDate = new Date('2025-12-25');
      prismaServiceMock.titles.findUnique.mockResolvedValue({ id: titleId });
      prismaServiceMock.user_watches.create.mockResolvedValue({
        id: watchId,
        date_vue: customDate,
      });

      await service.createWatch(userId, {
        title_id: titleId,
        date_vue: customDate,
      });

      expect(prismaServiceMock.user_watches.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date_vue: customDate,
          }),
        }),
      );
    });

    it('utilise la date du jour par défaut', async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue({ id: titleId });
      prismaServiceMock.user_watches.create.mockResolvedValue({ id: watchId });

      await service.createWatch(userId, { title_id: titleId });

      expect(prismaServiceMock.user_watches.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date_vue: expect.any(Date),
          }),
        }),
      );
    });

    it('lève BadRequest si ni title_id ni episode_id', async () => {
      await expect(service.createWatch(userId, {})).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequest si les deux sont fournis', async () => {
      await expect(
        service.createWatch(userId, { title_id: titleId, episode_id: episodeId }),
      ).rejects.toThrow(BadRequestException);
    });

    it("lève NotFound si le title_id n'existe pas", async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue(null);

      await expect(service.createWatch(userId, { title_id: 'nonexistent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lève NotFound si l'episode_id n'existe pas", async () => {
      prismaServiceMock.episodes.findUnique.mockResolvedValue(null);

      await expect(service.createWatch(userId, { episode_id: 'nonexistent' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ======================================================================
  // deleteWatch
  // ======================================================================
  describe('deleteWatch', () => {
    it('supprime un watch existant', async () => {
      prismaServiceMock.user_watches.findUnique.mockResolvedValue({
        id: watchId,
        user_id: userId,
      });
      prismaServiceMock.user_watches.delete.mockResolvedValue({});

      await service.deleteWatch(watchId, userId);

      expect(prismaServiceMock.user_watches.delete).toHaveBeenCalledWith({
        where: { id: watchId },
      });
    });

    it("lève NotFound si le watch n'existe pas", async () => {
      prismaServiceMock.user_watches.findUnique.mockResolvedValue(null);

      await expect(service.deleteWatch('nonexistent', userId)).rejects.toThrow(NotFoundException);
    });

    it('lève Forbidden si le watch appartient à un autre user', async () => {
      prismaServiceMock.user_watches.findUnique.mockResolvedValue({
        id: watchId,
        user_id: 'other-user',
      });

      await expect(service.deleteWatch(watchId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  // ======================================================================
  // listWatches
  // ======================================================================
  describe('listWatches', () => {
    it('retourne la liste paginée', async () => {
      const mockData = [{ id: watchId, title_id: titleId, date_vue: new Date() }];
      prismaServiceMock.user_watches.findMany.mockResolvedValue(mockData);
      prismaServiceMock.user_watches.count.mockResolvedValue(1);

      const result = await service.listWatches(userId, {});

      expect(result.items).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filtre par type film', async () => {
      prismaServiceMock.user_watches.findMany.mockResolvedValue([]);
      prismaServiceMock.user_watches.count.mockResolvedValue(0);

      await service.listWatches(userId, { type: 'film' });

      expect(prismaServiceMock.user_watches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            titles: { type: 'film' },
          }),
        }),
      );
    });

    it('filtre par type série : inclut aussi les visionnages par épisode (bug #44)', async () => {
      // Un visionnage d'épisode a title_id = null (cf. createWatch) : filtrer
      // uniquement sur `titles.type` ignorait tous les épisodes, qui sont
      // pourtant l'essentiel des visionnages de séries.
      prismaServiceMock.user_watches.findMany.mockResolvedValue([]);
      prismaServiceMock.user_watches.count.mockResolvedValue(0);

      await service.listWatches(userId, { type: 'serie' });

      expect(prismaServiceMock.user_watches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  { titles: { type: 'serie' } },
                  { episodes: { seasons: { titles: { type: 'serie' } } } },
                ],
              },
            ],
          }),
        }),
      );
    });

    it('filtre par title_id : inclut aussi les visionnages par épisode de cette série (modification M)', async () => {
      // Même problème que le filtre type : un visionnage d'épisode a
      // title_id = null, filtrer uniquement sur `title_id` manquait tous les
      // épisodes d'une série (historique de TitleActions toujours vide pour
      // les séries).
      prismaServiceMock.user_watches.findMany.mockResolvedValue([]);
      prismaServiceMock.user_watches.count.mockResolvedValue(0);

      await service.listWatches(userId, { title_id: titleId });

      expect(prismaServiceMock.user_watches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  { title_id: titleId },
                  { episodes: { seasons: { title_id: titleId } } },
                ],
              },
            ],
          }),
        }),
      );
    });

    it('filtre par date', async () => {
      prismaServiceMock.user_watches.findMany.mockResolvedValue([]);
      prismaServiceMock.user_watches.count.mockResolvedValue(0);

      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-12-31');

      await service.listWatches(userId, { date_from: dateFrom, date_to: dateTo });

      expect(prismaServiceMock.user_watches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date_vue: { gte: dateFrom, lte: dateTo },
          }),
        }),
      );
    });
  });

  // ======================================================================
  // getSerieProgress
  // ======================================================================
  describe('getSerieProgress', () => {
    it('appelle getSerieProgress depuis @emdb/db', async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue({
        id: titleId,
        type: 'serie',
      });

      const mockProgress = [{ saison: 1, vus: 10, total: 12 }];
      (getSerieProgress as jest.Mock).mockResolvedValue(mockProgress);

      const result = await service.getSerieProgress(userId, titleId);

      expect(result).toEqual(mockProgress);
      expect(getSerieProgress).toHaveBeenCalledWith(userId, titleId);
    });

    it("lève NotFound si le titre n'existe pas", async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue(null);

      await expect(service.getSerieProgress(userId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lève BadRequest si le titre n'est pas une série", async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue({
        id: titleId,
        type: 'film',
      });

      await expect(service.getSerieProgress(userId, titleId)).rejects.toThrow(BadRequestException);
    });
  });

  // ======================================================================
  // getCalendar
  // ======================================================================
  describe('getCalendar', () => {
    it('retourne une entrée par épisode non vu, avec saison/numéro/date', async () => {
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue([{ title_id: titleId }]);
      prismaServiceMock.episodes.findMany.mockResolvedValue([
        {
          numero: 3,
          titre: 'Episode Titre',
          date_sortie: new Date('2026-08-01'),
          seasons: {
            numero: 1,
            title_id: titleId,
            titles: { titre_vo: 'Serie Test', titre_vf: 'Série Test', affiche_url: '/poster.jpg' },
          },
        },
      ]);

      prismaServiceMock.episodes.count.mockResolvedValue(1);

      const result = await service.getCalendar(userId);

      expect(result).toEqual({
        items: [
          {
            title_id: titleId,
            titre_vo: 'Serie Test',
            titre_vf: 'Série Test',
            affiche_url: '/poster.jpg',
            saison: 1,
            episode_numero: 3,
            episode_titre: 'Episode Titre',
            date_diffusion: new Date('2026-08-01'),
            nb_non_vus: 1,
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      });
      expect(prismaServiceMock.episodes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            seasons: { title_id: { in: [titleId] } },
            user_watches: { none: { user_id: userId } },
            OR: [{ date_sortie: { gte: expect.any(Date) } }, { date_sortie: null }],
          },
        }),
      );
    });

    it('retourne un tableau vide si aucune série suivie', async () => {
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue([]);

      const result = await service.getCalendar(userId);

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 100, totalPages: 0 });
      expect(prismaServiceMock.episodes.findMany).not.toHaveBeenCalled();
    });

    it('calcule nb_non_vus par série à partir du nombre d’épisodes retournés', async () => {
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue([
        { title_id: 'serie-1' },
        { title_id: 'serie-2' },
      ]);
      prismaServiceMock.episodes.findMany.mockResolvedValue([
        {
          numero: 1,
          titre: null,
          date_sortie: null,
          seasons: {
            numero: 1,
            title_id: 'serie-1',
            titles: { titre_vo: 'Serie 1', titre_vf: null, affiche_url: null },
          },
        },
        {
          numero: 1,
          titre: null,
          date_sortie: null,
          seasons: {
            numero: 1,
            title_id: 'serie-2',
            titles: { titre_vo: 'Serie 2', titre_vf: null, affiche_url: null },
          },
        },
        {
          numero: 2,
          titre: null,
          date_sortie: null,
          seasons: {
            numero: 1,
            title_id: 'serie-2',
            titles: { titre_vo: 'Serie 2', titre_vf: null, affiche_url: null },
          },
        },
      ]);

      prismaServiceMock.episodes.count.mockResolvedValue(3);

      const result = await service.getCalendar(userId);

      expect(result.items.filter((entry) => entry.title_id === 'serie-1')[0].nb_non_vus).toBe(1);
      expect(result.items.filter((entry) => entry.title_id === 'serie-2')).toHaveLength(2);
      expect(result.items.filter((entry) => entry.title_id === 'serie-2')[0].nb_non_vus).toBe(2);
      expect(result.total).toBe(3);
    });
  });

  // ======================================================================
  // getContinueWatching
  // ======================================================================
  describe('getContinueWatching', () => {
    it('calcule la progression et exclut les séries entièrement vues', async () => {
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue([
        {
          title_id: 'serie-en-cours',
          titles: { id: 'serie-en-cours', titre_vo: 'En cours', titre_vf: null, affiche_url: null },
        },
        {
          title_id: 'serie-terminee',
          titles: { id: 'serie-terminee', titre_vo: 'Terminée', titre_vf: null, affiche_url: null },
        },
      ]);
      prismaServiceMock.episodes.findMany.mockResolvedValue([
        // serie-en-cours : 2 épisodes, 1 vu
        {
          id: 'ep-1',
          numero: 1,
          titre: 'Episode 1',
          date_sortie: new Date('2026-01-01'),
          seasons: { numero: 1, title_id: 'serie-en-cours' },
          user_watches: [{ date_vue: new Date('2026-01-02') }],
        },
        {
          id: 'ep-2',
          numero: 2,
          titre: 'Episode 2',
          date_sortie: new Date('2026-02-01'),
          seasons: { numero: 1, title_id: 'serie-en-cours' },
          user_watches: [],
        },
        // serie-terminee : 1 épisode, vu
        {
          id: 'ep-3',
          numero: 1,
          titre: null,
          date_sortie: new Date('2025-01-01'),
          seasons: { numero: 1, title_id: 'serie-terminee' },
          user_watches: [{ date_vue: new Date('2025-01-02') }],
        },
      ]);

      const result = await service.getContinueWatching(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title_id: 'serie-en-cours',
        episode_id: 'ep-2',
        saison: 1,
        episode_numero: 2,
        episode_titre: 'Episode 2',
        total_episodes: 2,
        episodes_vus: 1,
        episodes_restants: 1,
      });
    });

    it('retient le premier épisode non vu dans l’ordre saison/numéro comme prochain épisode', async () => {
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue([
        { title_id: 'serie', titles: { id: 'serie', titre_vo: 'Serie', titre_vf: null, affiche_url: null } },
      ]);
      prismaServiceMock.episodes.findMany.mockResolvedValue([
        {
          id: 's1e1',
          numero: 1,
          titre: null,
          date_sortie: new Date('2024-01-01'),
          seasons: { numero: 1, title_id: 'serie' },
          user_watches: [{ date_vue: new Date('2024-01-02') }],
        },
        {
          id: 's1e2',
          numero: 2,
          titre: null,
          date_sortie: new Date('2024-01-08'),
          seasons: { numero: 1, title_id: 'serie' },
          user_watches: [],
        },
        {
          id: 's2e1',
          numero: 1,
          titre: null,
          date_sortie: new Date('2025-01-01'),
          seasons: { numero: 2, title_id: 'serie' },
          user_watches: [],
        },
      ]);

      const result = await service.getContinueWatching(userId);

      expect(result[0].episode_id).toBe('s1e2');
      expect(result[0].saison).toBe(1);
      expect(result[0].episode_numero).toBe(2);
    });

    it('trie par MAX(dernier visionnage, dernière sortie) décroissant', async () => {
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue([
        { title_id: 'ancienne-activite', titles: { id: 'ancienne-activite', titre_vo: 'A', titre_vf: null, affiche_url: null } },
        { title_id: 'nouvel-episode', titles: { id: 'nouvel-episode', titre_vo: 'B', titre_vf: null, affiche_url: null } },
      ]);
      prismaServiceMock.episodes.findMany.mockResolvedValue([
        {
          id: 'ep-old',
          numero: 1,
          titre: null,
          date_sortie: new Date('2020-01-01'),
          seasons: { numero: 1, title_id: 'ancienne-activite' },
          user_watches: [],
        },
        {
          id: 'ep-new',
          numero: 1,
          titre: null,
          date_sortie: new Date('2026-08-01'),
          seasons: { numero: 1, title_id: 'nouvel-episode' },
          user_watches: [],
        },
      ]);

      const result = await service.getContinueWatching(userId);

      expect(result.map((entry) => entry.title_id)).toEqual(['nouvel-episode', 'ancienne-activite']);
    });

    it('retourne un tableau vide si aucune série suivie', async () => {
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue([]);

      const result = await service.getContinueWatching(userId);

      expect(result).toEqual([]);
      expect(prismaServiceMock.episodes.findMany).not.toHaveBeenCalled();
    });
  });

  // ======================================================================
  // follow
  // ======================================================================
  describe('follow', () => {
    it('suit une série existante', async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue({
        id: titleId,
        type: 'serie',
      });
      prismaServiceMock.user_follows_serie.create.mockResolvedValue({
        user_id: userId,
        title_id: titleId,
      });

      const result = await service.follow(userId, titleId);

      expect(result).toBeDefined();
      expect(prismaServiceMock.user_follows_serie.create).toHaveBeenCalledWith({
        data: { user_id: userId, title_id: titleId },
        include: expect.any(Object),
      });
    });

    it("lève NotFound si le titre n'existe pas", async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue(null);

      await expect(service.follow(userId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it("lève BadRequest si le titre n'est pas une série", async () => {
      prismaServiceMock.titles.findUnique.mockResolvedValue({
        id: titleId,
        type: 'film',
      });

      await expect(service.follow(userId, titleId)).rejects.toThrow(BadRequestException);
    });
  });

  // ======================================================================
  // unfollow
  // ======================================================================
  describe('unfollow', () => {
    it('ne plus suivre une série', async () => {
      prismaServiceMock.user_follows_serie.findUnique.mockResolvedValue({
        user_id: userId,
        title_id: titleId,
      });
      prismaServiceMock.user_follows_serie.delete.mockResolvedValue({});

      await service.unfollow(userId, titleId);

      expect(prismaServiceMock.user_follows_serie.delete).toHaveBeenCalledWith({
        where: { user_id_title_id: { user_id: userId, title_id: titleId } },
      });
    });

    it("lève NotFound si la série n'est pas suivie", async () => {
      prismaServiceMock.user_follows_serie.findUnique.mockResolvedValue(null);

      await expect(service.unfollow(userId, titleId)).rejects.toThrow(NotFoundException);
    });
  });

  // ======================================================================
  // getFollowedSeries
  // ======================================================================
  describe('getFollowedSeries', () => {
    it('retourne la liste des séries suivies', async () => {
      const mockFollows = [
        {
          title_id: titleId,
          followed_at: new Date('2026-07-23'),
          titles: {
            id: titleId,
            tmdb_id: 123,
            titre_vo: 'Serie Test',
            titre_vf: null,
            affiche_url: null,
            type: 'serie',
            next_episode_air_date: null,
          },
        },
      ];
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue(mockFollows);

      const result = await service.getFollowedSeries(userId);

      expect(result).toHaveLength(1);
      expect(result[0].titre_vo).toBe('Serie Test');
      expect(result[0].followed_at).toBeDefined();
    });

    it('retourne un tableau vide si aucune série suivie', async () => {
      prismaServiceMock.user_follows_serie.findMany.mockResolvedValue([]);

      const result = await service.getFollowedSeries(userId);

      expect(result).toEqual([]);
    });
  });
});
