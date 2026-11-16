import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ListsService } from './lists.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaServiceMock = {
  forUser: jest.fn((_userId: string, fn: any) => fn(prismaServiceMock)),
  asSystem: jest.fn((fn: any) => fn(prismaServiceMock)),
  user_lists: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  list_items: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  list_shares: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  list_groups: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  list_item_groups: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  titles: {
    findUnique: jest.fn(),
  },
  user_ratings: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  list_item_comments: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  users: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ListsService', () => {
  let service: ListsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListsService, { provide: PrismaService, useValue: prismaServiceMock }],
    }).compile();

    service = module.get<ListsService>(ListsService);
    jest.clearAllMocks();
    prismaServiceMock.list_shares.findMany.mockResolvedValue([]);
    prismaServiceMock.user_ratings.findMany.mockResolvedValue([]);
  });

  const userId = 'user-uuid';
  const listId = 'list-uuid';
  const titleId = 'title-uuid';
  const sharedWithUserId = 'shared-user-uuid';

  // Helpers pour construire les réponses Prisma mock
  const buildList = (overrides: any = {}) => ({
    id: overrides.id ?? listId,
    user_id: overrides.user_id ?? userId,
    nom: overrides.nom ?? 'Ma liste',
    type: overrides.type ?? 'watchlist',
    description: overrides.description ?? null,
    share_mode: overrides.share_mode ?? 'lecture',
    created_at: overrides.created_at ?? new Date('2026-07-23'),
    _count: overrides._count ?? { list_items: 0 },
    list_items: overrides.list_items ?? [],
  });

  const buildListItem = (overrides: any = {}) => ({
    list_id: overrides.list_id ?? listId,
    title_id: overrides.title_id ?? titleId,
    position: overrides.position ?? 0,
    added_at: overrides.added_at ?? new Date('2026-07-23'),
    vu_at: overrides.vu_at ?? null,
    vu_by_user: overrides.vu_by_user ?? null,
    list_item_groups: overrides.list_item_groups ?? [],
    _count: overrides._count ?? { list_item_comments: 0 },
    titles: overrides.titles ?? {
      id: titleId,
      tmdb_id: 123,
      titre_vo: 'Test Movie',
      titre_vf: 'Film Test',
      affiche_url: '/poster.jpg',
      type: 'film',
      date_sortie: new Date('2020-01-01'),
      note_imdb: 7.5,
      title_genres: [{ genre_id: 'genre-1', genres: { id: 'genre-1', nom: 'Action' } }],
      title_countries: [
        { country_id: 'country-1', countries: { id: 'country-1', nom: 'France' } },
      ],
    },
  });

  const buildShare = (overrides: any = {}) => ({
    list_id: overrides.list_id ?? listId,
    shared_with_user_id: overrides.shared_with_user_id ?? sharedWithUserId,
    shared_at: overrides.shared_at ?? new Date('2026-07-23'),
    users: overrides.users ?? {
      id: sharedWithUserId,
      pseudo: 'user2',
      avatar_url: null,
    },
  });

  /** Liste créée par 'owner-uuid', dont sharedWithUserId est membre. */
  const mockSharedList = (shareMode: 'lecture' | 'collaboratif' | 'ouvert', overrides: any = {}) => {
    prismaServiceMock.user_lists.findUnique.mockResolvedValue(
      buildList({ user_id: 'owner-uuid', type: 'custom', share_mode: shareMode, ...overrides }),
    );
    prismaServiceMock.list_shares.findUnique.mockResolvedValue(buildShare({}));
  };

  /** Liste dont userId est le créateur. */
  const mockOwnList = (overrides: any = {}) => {
    prismaServiceMock.user_lists.findUnique.mockResolvedValue(
      buildList({ user_id: userId, type: 'custom', ...overrides }),
    );
  };

  // ======================================================================
  // createList
  // ======================================================================
  describe('createList', () => {
    it("crée une liste de type watchlist si l'utilisateur n'en a pas déjà une", async () => {
      prismaServiceMock.user_lists.findFirst.mockResolvedValue(null);
      const expected = buildList({ type: 'watchlist' });
      prismaServiceMock.user_lists.create.mockResolvedValue(expected);

      const result = await service.createList(userId, {
        nom: 'Ma liste',
        type: 'watchlist',
      });

      expect(result).toEqual(expected);
      expect(prismaServiceMock.user_lists.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          nom: 'Ma liste',
          type: 'watchlist',
          description: null,
        },
      });
    });

    it("retourne la watchlist existante sans en créer une deuxième (bug #42)", async () => {
      const existing = buildList({ type: 'watchlist', nom: 'Ma Watchlist' });
      prismaServiceMock.user_lists.findFirst.mockResolvedValue(existing);

      const result = await service.createList(userId, {
        nom: 'Ma Watchlist',
        type: 'watchlist',
      });

      expect(result).toEqual(existing);
      expect(prismaServiceMock.user_lists.findFirst).toHaveBeenCalledWith({
        where: { user_id: userId, type: 'watchlist' },
        orderBy: { created_at: 'asc' },
      });
      expect(prismaServiceMock.user_lists.create).not.toHaveBeenCalled();
    });

    it('crée une liste de type custom avec description', async () => {
      const expected = buildList({
        type: 'custom',
        nom: 'Films préférés',
        description: 'Mes films préférés de 2026',
      });
      prismaServiceMock.user_lists.create.mockResolvedValue(expected);

      const result = await service.createList(userId, {
        nom: 'Films préférés',
        type: 'custom',
        description: 'Mes films préférés de 2026',
      });

      expect(result).toEqual(expected);
      expect(prismaServiceMock.user_lists.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          nom: 'Films préférés',
          type: 'custom',
          description: 'Mes films préférés de 2026',
        },
      });
    });

    it('crée une liste (le type est validé par class-validator dans le DTO)', async () => {
      // La validation du type enum est faite par class-validator au niveau du DTO.
      // Le service reçoit le type déjà validé et le passe à Prisma.
      prismaServiceMock.user_lists.findFirst.mockResolvedValue(null);
      const expected = buildList({ type: 'watchlist', nom: 'Test' });
      prismaServiceMock.user_lists.create.mockResolvedValue(expected);

      const result = await service.createList(userId, {
        nom: 'Test',
        type: 'watchlist',
      });

      expect(result.nom).toBe('Test');
      expect(result.type).toBe('watchlist');
    });
  });

  // ======================================================================
  // getUserLists
  // ======================================================================
  describe('getUserLists', () => {
    it("retourne les listes de l'utilisateur avec des items allégés pour le filtrage", async () => {
      const lists = [
        buildList({
          id: 'list-1',
          nom: 'Liste 1',
          list_items: [buildListItem()],
        }),
        buildList({ id: 'list-2', nom: 'Liste 2' }),
      ];
      prismaServiceMock.user_lists.findMany.mockResolvedValue(lists);

      const result = await service.getUserLists(userId);

      expect(result[0].id).toBe('list-1');
      expect(result[0].items).toEqual([
        {
          titleId,
          type: 'film',
          year: 2020,
          note: 7.5,
          genreIds: ['genre-1'],
          countryIds: ['country-1'],
        },
      ]);
      expect(result[1].items).toEqual([]);
      expect((result[0] as any).list_items).toBeUndefined();
      expect(prismaServiceMock.user_lists.findMany).toHaveBeenCalledWith({
        where: { user_id: userId },
        include: {
          _count: { select: { list_items: true, list_shares: true } },
          list_items: {
            select: {
              statut: true,
              titles: {
                select: {
                  id: true,
                  type: true,
                  date_sortie: true,
                  note_imdb: true,
                  title_genres: { select: { genre_id: true } },
                  title_countries: { select: { country_id: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });
    });

    it('retourne un tableau vide si aucune liste', async () => {
      prismaServiceMock.user_lists.findMany.mockResolvedValue([]);

      const result = await service.getUserLists(userId);

      expect(result).toEqual([]);
    });
  });

  // ======================================================================
  // getListDetail
  // ======================================================================
  describe('getListDetail', () => {
    it('retourne la liste avec ses items au format frontend (Title) si propriétaire', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.list_items.findMany.mockResolvedValue([
        buildListItem({ position: 0 }),
        buildListItem({ title_id: 'title-2', position: 1 }),
      ]);

      const result = await service.getListDetail(listId, userId);

      expect(result.id).toBe(listId);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        id: titleId,
        tmdbId: 123,
        titre: 'Test Movie',
        titreOriginal: 'Film Test',
        type: 'film',
        note: 7.5,
        afficheUrl: '/poster.jpg',
        genres: [{ id: 'genre-1', nom: 'Action' }],
        pays: [{ id: 'country-1', nom: 'France' }],
        position: 0,
      });
      expect(result.items[0].dateSortie).toBeDefined();
    });

    it('renvoie le rôle et les droits du créateur', async () => {
      mockOwnList();
      prismaServiceMock.users.findUnique.mockResolvedValue({ id: userId, pseudo: 'moi', avatar_url: null });
      prismaServiceMock.list_items.findMany.mockResolvedValue([]);

      const result = await service.getListDetail(listId, userId);

      expect(result.role).toBe('owner');
      expect(result.owner).toEqual({ id: userId, pseudo: 'moi', avatar_url: null });
      expect(result.capabilities).toEqual({
        canAddItems: true,
        canRemoveItems: true,
        canEditItems: true,
        canEditList: true,
        canDeleteList: true,
        canManageShares: true,
      });
    });

    it('retourne la liste à un membre en mode lecture, sans droit de modification', async () => {
      mockSharedList('lecture');
      prismaServiceMock.list_items.findMany.mockResolvedValue([]);

      const result = await service.getListDetail(listId, sharedWithUserId);

      expect(result.id).toBe(listId);
      expect(result.items).toHaveLength(0);
      expect(result.role).toBe('member');
      expect(result.share_mode).toBe('lecture');
      expect(result.capabilities).toEqual({
        canAddItems: false,
        canRemoveItems: false,
        canEditItems: false,
        canEditList: false,
        canDeleteList: false,
        canManageShares: false,
      });
    });

    it("renvoie les droits d'un membre en mode ouvert", async () => {
      mockSharedList('ouvert');
      prismaServiceMock.list_items.findMany.mockResolvedValue([]);

      const result = await service.getListDetail(listId, sharedWithUserId);

      expect(result.capabilities).toMatchObject({
        canAddItems: true,
        canRemoveItems: true,
        canEditList: true,
        canDeleteList: false,
        canManageShares: false,
      });
    });

    it('lève Forbidden si non propriétaire et non membre', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(
        buildList({ user_id: 'other-user' }),
      );
      prismaServiceMock.list_shares.findUnique.mockResolvedValue(null);

      await expect(service.getListDetail(listId, userId)).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFound si la liste n'existe pas", async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(null);

      await expect(service.getListDetail('nonexistent', userId)).rejects.toThrow(NotFoundException);
    });

  });

  // ======================================================================
  // updateList
  // ======================================================================
  describe('updateList', () => {
    it('met à jour le nom si propriétaire', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.user_lists.update.mockResolvedValue(buildList({ nom: 'Nouveau nom' }));

      const result = await service.updateList(listId, userId, {
        nom: 'Nouveau nom',
      });

      expect(result.nom).toBe('Nouveau nom');
      expect(prismaServiceMock.user_lists.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: { nom: 'Nouveau nom' },
      });
    });

    it('met à jour la description si propriétaire', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.user_lists.update.mockResolvedValue(
        buildList({ description: 'Nouvelle description' }),
      );

      const result = await service.updateList(listId, userId, {
        description: 'Nouvelle description',
      });

      expect(result.description).toBe('Nouvelle description');
    });

    it('lève Forbidden pour un membre en mode lecture', async () => {
      mockSharedList('lecture');

      await expect(
        service.updateList(listId, sharedWithUserId, { nom: 'Nouveau nom' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaServiceMock.user_lists.update).not.toHaveBeenCalled();
    });

    it('autorise un membre en mode collaboratif à renommer', async () => {
      mockSharedList('collaboratif');
      prismaServiceMock.user_lists.update.mockResolvedValue(buildList({ nom: 'Renommée' }));

      await service.updateList(listId, sharedWithUserId, { nom: 'Renommée' });

      expect(prismaServiceMock.user_lists.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: { nom: 'Renommée' },
      });
    });
  });

  // ======================================================================
  // deleteList
  // ======================================================================
  describe('deleteList', () => {
    it('supprime la liste si propriétaire', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.user_lists.delete.mockResolvedValue({});

      await service.deleteList(listId, userId);

      expect(prismaServiceMock.user_lists.delete).toHaveBeenCalledWith({
        where: { id: listId },
      });
    });

    it('lève Forbidden pour un membre, même en mode ouvert', async () => {
      mockSharedList('ouvert');

      await expect(service.deleteList(listId, sharedWithUserId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaServiceMock.user_lists.delete).not.toHaveBeenCalled();
    });

    it("lève NotFound si la liste n'existe pas", async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(null);

      await expect(service.deleteList('nonexistent', userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ======================================================================
  // addItem
  // ======================================================================
  describe('addItem', () => {
    it('ajoute un item avec la bonne position (max+1)', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.titles.findUnique.mockResolvedValue({ id: titleId });
      prismaServiceMock.list_items.findFirst.mockResolvedValue({
        position: 5,
      });
      prismaServiceMock.list_items.create.mockResolvedValue(buildListItem({ position: 6 }));

      const result = await service.addItem(listId, userId, titleId);

      expect(result.position).toBe(6);
      expect(prismaServiceMock.list_items.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 6 }),
        }),
      );
    });

    it('ajoute le premier item (position=0)', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.titles.findUnique.mockResolvedValue({ id: titleId });
      prismaServiceMock.list_items.findFirst.mockResolvedValue(null);
      prismaServiceMock.list_items.create.mockResolvedValue(buildListItem({ position: 0 }));

      const result = await service.addItem(listId, userId, titleId);

      expect(result.position).toBe(0);
    });

    it.each(['lecture', 'collaboratif'] as const)(
      'lève Forbidden pour un membre en mode %s',
      async (mode) => {
        mockSharedList(mode);

        await expect(service.addItem(listId, sharedWithUserId, titleId)).rejects.toThrow(
          ForbiddenException,
        );
        expect(prismaServiceMock.list_items.create).not.toHaveBeenCalled();
      },
    );

    it('autorise un membre en mode ouvert à ajouter un titre', async () => {
      mockSharedList('ouvert');
      prismaServiceMock.titles.findUnique.mockResolvedValue({ id: titleId });
      prismaServiceMock.list_items.findUnique.mockResolvedValue(null);
      prismaServiceMock.list_items.findFirst.mockResolvedValue(null);
      prismaServiceMock.list_items.create.mockResolvedValue(buildListItem({ position: 0 }));

      await service.addItem(listId, sharedWithUserId, titleId);

      expect(prismaServiceMock.list_items.create).toHaveBeenCalled();
    });

    it("lève NotFound si le titre n'existe pas", async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.titles.findUnique.mockResolvedValue(null);

      await expect(service.addItem(listId, userId, 'nonexistent-title')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ======================================================================
  // removeItem
  // ======================================================================
  describe('removeItem', () => {
    it('retire un item existant', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.list_items.findUnique.mockResolvedValue(buildListItem({}));
      prismaServiceMock.list_items.delete.mockResolvedValue({});

      await service.removeItem(listId, userId, titleId);

      expect(prismaServiceMock.list_items.delete).toHaveBeenCalledWith({
        where: {
          list_id_title_id: { list_id: listId, title_id: titleId },
        },
      });
    });

    it('lève Forbidden pour un membre en mode collaboratif', async () => {
      mockSharedList('collaboratif');

      await expect(service.removeItem(listId, sharedWithUserId, titleId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaServiceMock.list_items.delete).not.toHaveBeenCalled();
    });

    it("lève NotFound si l'item n'existe pas dans la liste", async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.list_items.findUnique.mockResolvedValue(null);

      await expect(service.removeItem(listId, userId, 'nonexistent-title')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ======================================================================
  // reorderItems
  // ======================================================================
  describe('reorderItems', () => {
    it('met à jour les positions dans une transaction', async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.list_items.findMany.mockResolvedValue([
        { title_id: 'title-1' },
        { title_id: 'title-2' },
      ]);
      prismaServiceMock.list_items.update.mockReturnValue(Promise.resolve({}));
      prismaServiceMock.$transaction.mockImplementation(async (ops: any[]) => {
        // Vérifie que 2 opérations sont passées à la transaction
        expect(ops).toHaveLength(2);
        return Promise.all(ops);
      });

      await service.reorderItems(listId, userId, {
        items: [
          { title_id: 'title-1', position: 1 },
          { title_id: 'title-2', position: 0 },
        ],
      });

      // Vérifie que list_items.update a été appelé pour chaque item
      expect(prismaServiceMock.list_items.update).toHaveBeenCalledTimes(2);
      // Vérifie les appels avec les bonnes positions
      expect(prismaServiceMock.list_items.update).toHaveBeenCalledWith({
        where: { list_id_title_id: { list_id: listId, title_id: 'title-1' } },
        data: { position: 1 },
      });
      expect(prismaServiceMock.list_items.update).toHaveBeenCalledWith({
        where: { list_id_title_id: { list_id: listId, title_id: 'title-2' } },
        data: { position: 0 },
      });
    });

    it('lève Forbidden pour un membre en mode lecture', async () => {
      mockSharedList('lecture');

      await expect(
        service.reorderItems(listId, sharedWithUserId, {
          items: [{ title_id: titleId, position: 0 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFound si un title_id n'appartient pas à la liste", async () => {
      prismaServiceMock.user_lists.findUnique.mockResolvedValue(buildList({ user_id: userId }));
      prismaServiceMock.list_items.findMany.mockResolvedValue([{ title_id: 'title-1' }]);

      await expect(
        service.reorderItems(listId, userId, {
          items: [
            { title_id: 'title-1', position: 0 },
            { title_id: 'title-2', position: 1 },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ======================================================================
  // getListDetail — vu et sous-groupes
  // ======================================================================
  describe('getListDetail (vu et sous-groupes)', () => {
    it('renvoie les sous-groupes, le vu partagé et les groupes de chaque titre', async () => {
      mockOwnList();
      prismaServiceMock.list_items.findMany.mockResolvedValue([
        buildListItem({
          vu_at: new Date('2026-11-16'),
          vu_by_user: { pseudo: 'marie' },
          list_item_groups: [{ group_id: 'g-tennis' }],
        }),
      ]);
      prismaServiceMock.list_groups.findMany.mockResolvedValue([
        { id: 'g-sport', parent_id: null, nom: 'Sport', position: 0 },
        { id: 'g-tennis', parent_id: 'g-sport', nom: 'Tennis', position: 0 },
      ]);
      prismaServiceMock.list_shares.count.mockResolvedValue(2);

      const result = await service.getListDetail(listId, userId);

      expect(result.groups).toHaveLength(2);
      expect(result.member_count).toBe(2);
      expect(result.items[0]).toMatchObject({ vu: true, vuBy: 'marie', groupIds: ['g-tennis'] });
    });
  });

  // ======================================================================
  // setItemVu
  // ======================================================================
  describe('setItemVu', () => {
    it("marque un titre comme vu pour toute la liste, avec l'auteur", async () => {
      mockSharedList('collaboratif');
      prismaServiceMock.list_items.findUnique.mockResolvedValue({ list_id: listId });
      prismaServiceMock.list_items.update.mockResolvedValue({
        title_id: titleId,
        vu_at: new Date('2026-11-16'),
        vu_by_user: { pseudo: 'user2' },
      });

      const result = await service.setItemVu(listId, sharedWithUserId, titleId, { vu: true });

      expect(prismaServiceMock.list_items.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { vu_at: expect.any(Date), vu_by: sharedWithUserId },
        }),
      );
      expect(result).toMatchObject({ vu: true, vuBy: 'user2' });
    });

    it("retire le vu (vu_at et vu_by remis à null)", async () => {
      mockOwnList();
      prismaServiceMock.list_items.findUnique.mockResolvedValue({ list_id: listId });
      prismaServiceMock.list_items.update.mockResolvedValue({
        title_id: titleId,
        vu_at: null,
        vu_by_user: null,
      });

      const result = await service.setItemVu(listId, userId, titleId, { vu: false });

      expect(prismaServiceMock.list_items.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { vu_at: null, vu_by: null } }),
      );
      expect(result.vu).toBe(false);
    });

    it('lève Forbidden pour un membre en mode lecture', async () => {
      mockSharedList('lecture');

      await expect(
        service.setItemVu(listId, sharedWithUserId, titleId, { vu: true }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaServiceMock.list_items.update).not.toHaveBeenCalled();
    });

    it("lève NotFound si le titre n'est pas dans la liste", async () => {
      mockOwnList();
      prismaServiceMock.list_items.findUnique.mockResolvedValue(null);

      await expect(service.setItemVu(listId, userId, titleId, { vu: true })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ======================================================================
  // Sous-groupes
  // ======================================================================
  describe('createGroup', () => {
    it('crée un sous-groupe sous un parent de la même liste, en dernière position', async () => {
      mockOwnList();
      prismaServiceMock.list_groups.findFirst
        .mockResolvedValueOnce({ id: 'g-sport' }) // parent
        .mockResolvedValueOnce({ position: 1 }); // dernier frère
      prismaServiceMock.list_groups.create.mockResolvedValue({ id: 'g-tennis' });

      await service.createGroup(listId, userId, { nom: '  Tennis ', parent_id: 'g-sport' });

      expect(prismaServiceMock.list_groups.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { list_id: listId, parent_id: 'g-sport', nom: 'Tennis', position: 2 },
        }),
      );
    });

    it("lève NotFound si le parent n'est pas dans la liste", async () => {
      mockOwnList();
      prismaServiceMock.list_groups.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.createGroup(listId, userId, { nom: 'Tennis', parent_id: 'g-autre-liste' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaServiceMock.list_groups.create).not.toHaveBeenCalled();
    });

    it('lève Forbidden pour un membre en mode collaboratif (création = mode ouvert)', async () => {
      mockSharedList('collaboratif');

      await expect(service.createGroup(listId, sharedWithUserId, { nom: 'Foot' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('renameGroup / deleteGroup', () => {
    it('autorise un membre en collaboratif à renommer', async () => {
      mockSharedList('collaboratif');
      prismaServiceMock.list_groups.findFirst.mockResolvedValue({ id: 'g-sport' });
      prismaServiceMock.list_groups.update.mockResolvedValue({ id: 'g-sport', nom: 'Sports' });

      await service.renameGroup(listId, sharedWithUserId, 'g-sport', { nom: 'Sports' });

      expect(prismaServiceMock.list_groups.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'g-sport' }, data: { nom: 'Sports' } }),
      );
    });

    it('refuse la suppression à un membre en collaboratif', async () => {
      mockSharedList('collaboratif');

      await expect(service.deleteGroup(listId, sharedWithUserId, 'g-sport')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaServiceMock.list_groups.delete).not.toHaveBeenCalled();
    });

    it("lève NotFound pour un groupe d'une autre liste", async () => {
      mockOwnList();
      prismaServiceMock.list_groups.findFirst.mockResolvedValue(null);

      await expect(service.deleteGroup(listId, userId, 'g-ailleurs')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setItemGroups', () => {
    it('remplace les sous-groupes du titre (doublons ignorés)', async () => {
      mockSharedList('collaboratif');
      prismaServiceMock.list_items.findUnique.mockResolvedValue({ list_id: listId });
      prismaServiceMock.list_groups.count.mockResolvedValue(2);

      const result = await service.setItemGroups(listId, sharedWithUserId, titleId, {
        group_ids: ['g-sport', 'g-tennis', 'g-tennis'],
      });

      expect(prismaServiceMock.list_item_groups.deleteMany).toHaveBeenCalledWith({
        where: { list_id: listId, title_id: titleId },
      });
      expect(prismaServiceMock.list_item_groups.createMany).toHaveBeenCalledWith({
        data: [
          { list_id: listId, title_id: titleId, group_id: 'g-sport' },
          { list_id: listId, title_id: titleId, group_id: 'g-tennis' },
        ],
      });
      expect(result.groupIds).toEqual(['g-sport', 'g-tennis']);
    });

    it("lève NotFound si un groupe n'appartient pas à la liste", async () => {
      mockOwnList();
      prismaServiceMock.list_items.findUnique.mockResolvedValue({ list_id: listId });
      prismaServiceMock.list_groups.count.mockResolvedValue(1);

      await expect(
        service.setItemGroups(listId, userId, titleId, { group_ids: ['g-1', 'g-autre'] }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaServiceMock.list_item_groups.deleteMany).not.toHaveBeenCalled();
    });

    it('lève Forbidden pour un membre en lecture', async () => {
      mockSharedList('lecture');

      await expect(
        service.setItemGroups(listId, sharedWithUserId, titleId, { group_ids: [] }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ======================================================================
  // Commentaires perso dans le détail d'une liste
  // ======================================================================
  describe('getListDetail (commentaires)', () => {
    it("renvoie mon commentaire, ceux des membres qui les partagent, et le nombre de commentaires du fil", async () => {
      mockOwnList();
      prismaServiceMock.list_items.findMany.mockResolvedValue([
        buildListItem({ _count: { list_item_comments: 3 } }),
      ]);
      prismaServiceMock.list_shares.findMany.mockResolvedValue([{ shared_with_user_id: 'u2' }]);
      prismaServiceMock.user_ratings.findMany
        .mockResolvedValueOnce([{ title_id: titleId, commentaire: 'Mon avis' }])
        .mockResolvedValueOnce([
          { title_id: titleId, commentaire: 'Génial', users: { pseudo: 'marie' } },
        ]);

      const result = await service.getListDetail(listId, userId);

      expect(result.items[0]).toMatchObject({
        myComment: 'Mon avis',
        memberComments: [{ pseudo: 'marie', commentaire: 'Génial' }],
        commentCount: 3,
      });
      // Les commentaires des autres ne sont lus que pour les membres de la
      // liste, hors moi, ayant activé le partage.
      expect(prismaServiceMock.user_ratings.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: { in: ['u2'] },
            title_id: { in: [titleId] },
            users: { commentaires_visibles: true },
          }),
        }),
      );
    });

    it("ne lit pas les commentaires des autres pour une liste non partagée", async () => {
      mockOwnList();
      prismaServiceMock.list_items.findMany.mockResolvedValue([buildListItem({})]);

      const result = await service.getListDetail(listId, userId);

      expect(result.items[0].memberComments).toEqual([]);
      expect(prismaServiceMock.user_ratings.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // ======================================================================
  // Fil de commentaires partagés
  // ======================================================================
  describe('commentaires partagés', () => {
    const comment = (overrides: any = {}) => ({
      id: overrides.id ?? 'c1',
      contenu: overrides.contenu ?? 'Super film',
      created_at: new Date('2026-11-16'),
      updated_at: new Date('2026-11-16'),
      user_id: overrides.user_id ?? sharedWithUserId,
      users: { pseudo: overrides.pseudo ?? 'user2', avatar_url: null },
    });

    it('un membre en lecture lit le fil mais ne peut ni écrire ni supprimer', async () => {
      mockSharedList('lecture');
      prismaServiceMock.list_item_comments.findMany.mockResolvedValue([comment()]);

      const result = await service.getItemComments(listId, sharedWithUserId, titleId);

      expect(result.canWrite).toBe(false);
      expect(result.comments[0]).toMatchObject({
        contenu: 'Super film',
        author: { pseudo: 'user2' },
        canEdit: false,
        canDelete: false,
      });
    });

    it('le créateur peut supprimer le commentaire de quelqu’un d’autre (modération)', async () => {
      mockOwnList();
      prismaServiceMock.list_item_comments.findMany.mockResolvedValue([comment()]);

      const result = await service.getItemComments(listId, userId, titleId);

      expect(result.comments[0]).toMatchObject({ canEdit: false, canDelete: true });
    });

    it('un membre en collaboratif ajoute un commentaire (texte nettoyé)', async () => {
      mockSharedList('collaboratif');
      prismaServiceMock.list_items.findUnique.mockResolvedValue({ list_id: listId });
      prismaServiceMock.list_item_comments.create.mockResolvedValue(comment({ contenu: 'À revoir' }));

      const result = await service.addItemComment(listId, sharedWithUserId, titleId, {
        contenu: '  À revoir  ',
      });

      expect(prismaServiceMock.list_item_comments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { list_id: listId, title_id: titleId, user_id: sharedWithUserId, contenu: 'À revoir' },
        }),
      );
      expect(result).toMatchObject({ canEdit: true, canDelete: true });
    });

    it('un membre en lecture ne peut pas commenter', async () => {
      mockSharedList('lecture');

      await expect(
        service.addItemComment(listId, sharedWithUserId, titleId, { contenu: 'Hop' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaServiceMock.list_item_comments.create).not.toHaveBeenCalled();
    });

    it("on ne modifie pas le commentaire de quelqu'un d'autre, même en mode ouvert", async () => {
      mockSharedList('ouvert');
      prismaServiceMock.list_item_comments.findFirst.mockResolvedValue({ id: 'c1', user_id: 'autre' });

      await expect(
        service.updateItemComment(listId, sharedWithUserId, 'c1', { contenu: 'Modifié' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaServiceMock.list_item_comments.update).not.toHaveBeenCalled();
    });

    it("un membre ne supprime pas le commentaire d'un autre ; le créateur si", async () => {
      mockSharedList('ouvert');
      prismaServiceMock.list_item_comments.findFirst.mockResolvedValue({ id: 'c1', user_id: 'autre' });
      await expect(service.deleteItemComment(listId, sharedWithUserId, 'c1')).rejects.toThrow(
        ForbiddenException,
      );

      mockOwnList();
      await service.deleteItemComment(listId, userId, 'c1');
      expect(prismaServiceMock.list_item_comments.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it("lève NotFound pour un commentaire d'une autre liste", async () => {
      mockOwnList();
      prismaServiceMock.list_item_comments.findFirst.mockResolvedValue(null);

      await expect(service.deleteItemComment(listId, userId, 'c-ailleurs')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ======================================================================
  // updateShareMode
  // ======================================================================
  describe('updateShareMode', () => {
    it('change le mode si créateur', async () => {
      mockOwnList();
      prismaServiceMock.user_lists.update.mockResolvedValue(buildList({ share_mode: 'ouvert' }));

      await service.updateShareMode(listId, userId, { share_mode: 'ouvert' });

      expect(prismaServiceMock.user_lists.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: { share_mode: 'ouvert' },
      });
    });

    it('lève Forbidden pour un membre, même en mode ouvert', async () => {
      mockSharedList('ouvert');

      await expect(
        service.updateShareMode(listId, sharedWithUserId, { share_mode: 'lecture' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaServiceMock.user_lists.update).not.toHaveBeenCalled();
    });

    it('lève BadRequest sur une watchlist', async () => {
      mockOwnList({ type: 'watchlist' });

      await expect(
        service.updateShareMode(listId, userId, { share_mode: 'ouvert' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ======================================================================
  // shareList
  // ======================================================================
  describe('shareList', () => {
    it('ajoute un membre', async () => {
      mockOwnList();
      prismaServiceMock.users.findUnique.mockResolvedValue({ id: sharedWithUserId });
      prismaServiceMock.list_shares.findUnique.mockResolvedValue(null);
      prismaServiceMock.list_shares.create.mockResolvedValue(buildShare({}));

      const result = await service.shareList(listId, userId, {
        shared_with_user_id: sharedWithUserId,
      });

      expect(result.shared_with_user_id).toBe(sharedWithUserId);
      expect(prismaServiceMock.list_shares.create).toHaveBeenCalledWith({
        data: { list_id: listId, shared_with_user_id: sharedWithUserId },
        include: {
          users: { select: { id: true, pseudo: true, avatar_url: true } },
        },
      });
    });

    it.each(['watchlist', 'favoris'])('lève BadRequest sur une liste %s', async (type) => {
      mockOwnList({ type });

      await expect(
        service.shareList(listId, userId, { shared_with_user_id: sharedWithUserId }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaServiceMock.list_shares.create).not.toHaveBeenCalled();
    });

    it('lève BadRequest pour un partage avec soi-même', async () => {
      mockOwnList();

      await expect(
        service.shareList(listId, userId, { shared_with_user_id: userId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève Conflict si déjà membre', async () => {
      mockOwnList();
      prismaServiceMock.users.findUnique.mockResolvedValue({ id: sharedWithUserId });
      prismaServiceMock.list_shares.findUnique.mockResolvedValue(buildShare({}));

      await expect(
        service.shareList(listId, userId, { shared_with_user_id: sharedWithUserId }),
      ).rejects.toThrow(ConflictException);
      expect(prismaServiceMock.list_shares.create).not.toHaveBeenCalled();
    });

    it("lève NotFound si shared_with_user_id n'existe pas", async () => {
      mockOwnList();
      prismaServiceMock.users.findUnique.mockResolvedValue(null);

      await expect(
        service.shareList(listId, userId, { shared_with_user_id: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève Forbidden pour un membre, même en mode ouvert', async () => {
      mockSharedList('ouvert');

      await expect(
        service.shareList(listId, sharedWithUserId, { shared_with_user_id: 'someone-else' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ======================================================================
  // getShares
  // ======================================================================
  describe('getShares', () => {
    it('liste les membres si créateur', async () => {
      mockOwnList();
      const shares = [
        buildShare({ shared_with_user_id: 'user-2' }),
        buildShare({ shared_with_user_id: 'user-3' }),
      ];
      prismaServiceMock.list_shares.findMany.mockResolvedValue(shares);

      const result = await service.getShares(listId, userId);

      expect(result).toHaveLength(2);
      expect(prismaServiceMock.list_shares.findMany).toHaveBeenCalledWith({
        where: { list_id: listId },
        include: {
          users: { select: { id: true, pseudo: true, avatar_url: true } },
        },
        orderBy: { shared_at: 'desc' },
      });
    });

    it('lève Forbidden pour un membre', async () => {
      mockSharedList('collaboratif');

      await expect(service.getShares(listId, sharedWithUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ======================================================================
  // removeShare
  // ======================================================================
  describe('removeShare', () => {
    it('retire un membre si créateur', async () => {
      mockOwnList();
      prismaServiceMock.list_shares.findUnique.mockResolvedValue(buildShare({}));
      prismaServiceMock.list_shares.delete.mockResolvedValue({});

      await service.removeShare(listId, userId, sharedWithUserId);

      expect(prismaServiceMock.list_shares.delete).toHaveBeenCalledWith({
        where: {
          list_id_shared_with_user_id: {
            list_id: listId,
            shared_with_user_id: sharedWithUserId,
          },
        },
      });
    });

    it("lève NotFound si le partage n'existe pas", async () => {
      mockOwnList();
      prismaServiceMock.list_shares.findUnique.mockResolvedValue(null);

      await expect(service.removeShare(listId, userId, sharedWithUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lève Forbidden pour un membre qui tente de retirer quelqu'un d'autre", async () => {
      mockSharedList('ouvert');

      await expect(service.removeShare(listId, sharedWithUserId, 'user-3')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaServiceMock.list_shares.delete).not.toHaveBeenCalled();
    });
  });

  // ======================================================================
  // leaveSharedList
  // ======================================================================
  describe('leaveSharedList', () => {
    it("supprime l'appartenance du membre connecté", async () => {
      prismaServiceMock.list_shares.findUnique.mockResolvedValue(buildShare({}));
      prismaServiceMock.list_shares.delete.mockResolvedValue({});

      await service.leaveSharedList(listId, sharedWithUserId);

      expect(prismaServiceMock.list_shares.delete).toHaveBeenCalledWith({
        where: {
          list_id_shared_with_user_id: {
            list_id: listId,
            shared_with_user_id: sharedWithUserId,
          },
        },
      });
    });

    it("lève NotFound si l'utilisateur n'est pas membre", async () => {
      prismaServiceMock.list_shares.findUnique.mockResolvedValue(null);

      await expect(service.leaveSharedList(listId, userId)).rejects.toThrow(NotFoundException);
      expect(prismaServiceMock.list_shares.delete).not.toHaveBeenCalled();
    });
  });

  // ======================================================================
  // getSharedLists
  // ======================================================================
  describe('getSharedLists', () => {
    it("retourne les listes partagées avec l'utilisateur et ses droits", async () => {
      const shares = [
        {
          list_id: listId,
          shared_at: new Date('2026-07-23'),
          user_lists: {
            id: listId,
            nom: 'Liste partagée',
            type: 'custom',
            description: null,
            share_mode: 'collaboratif',
            created_at: new Date('2026-07-22'),
            users: { id: 'owner-id', pseudo: 'owner', avatar_url: null },
            _count: { list_items: 3 },
          },
        },
      ];
      prismaServiceMock.list_shares.findMany.mockResolvedValue(shares);

      const result = await service.getSharedLists(sharedWithUserId);

      expect(result).toHaveLength(1);
      expect(result[0].share_mode).toBe('collaboratif');
      expect(result[0].capabilities).toMatchObject({
        canEditItems: true,
        canAddItems: false,
        canManageShares: false,
      });
      expect(result[0].list.nom).toBe('Liste partagée');
      expect(result[0].list.item_count).toBe(3);
      expect(result[0].list.owner.pseudo).toBe('owner');
    });

    it('retourne un tableau vide si aucun partage', async () => {
      prismaServiceMock.list_shares.findMany.mockResolvedValue([]);

      const result = await service.getSharedLists(userId);

      expect(result).toEqual([]);
    });
  });
});
