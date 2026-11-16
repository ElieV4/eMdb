import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaServiceMock = {
  users: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: any = {
    id: 'user-id',
    email: 'test@example.com',
    pseudo: 'testuser',
    avatar_url: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('retourne le profil public si l’utilisateur existe', async () => {
      prismaServiceMock.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.getById('user-id');

      expect(result).toEqual(mockUser);
      expect(prismaServiceMock.users.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: { id: true, email: true, pseudo: true, avatar_url: true, created_at: true },
      });
    });

    it('lève NotFoundException si l’utilisateur n’existe pas', async () => {
      prismaServiceMock.users.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('met à jour le pseudo et l’avatar_url', async () => {
      const updatedUser = {
        ...mockUser,
        pseudo: 'newpseudo',
        avatar_url: 'https://example.com/avatar.png',
      };
      prismaServiceMock.users.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-id', {
        pseudo: 'newpseudo',
        avatar_url: 'https://example.com/avatar.png',
      });

      expect(result.pseudo).toBe('newpseudo');
      expect(result.avatar_url).toBe('https://example.com/avatar.png');
    });

    it('met à jour uniquement le pseudo si avatar_url est absent', async () => {
      const updatedUser = { ...mockUser, pseudo: 'newpseudo' };
      prismaServiceMock.users.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-id', { pseudo: 'newpseudo' });

      expect(result.pseudo).toBe('newpseudo');
    });
  });

  describe('updateAvatar', () => {
    it('met à jour l’URL de l’avatar', async () => {
      const updatedUser = { ...mockUser, avatar_url: '/uploads/avatars/avatar.png' };
      prismaServiceMock.users.update.mockResolvedValue(updatedUser);

      const result = await service.updateAvatar('user-id', '/uploads/avatars/avatar.png');

      expect(result.avatar_url).toBe('/uploads/avatars/avatar.png');
      expect(prismaServiceMock.users.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { avatar_url: '/uploads/avatars/avatar.png' },
        select: { id: true, email: true, pseudo: true, avatar_url: true, created_at: true },
      });
    });
  });

  describe('findByPseudoOrEmail', () => {
    const select = { id: true, pseudo: true, avatar_url: true };

    it("cherche un fragment de pseudo, comptes actifs uniquement, sans l'utilisateur connecté", async () => {
      const users = [
        { id: '1', pseudo: 'user1', avatar_url: null },
        { id: '2', pseudo: 'user2', avatar_url: null },
      ];
      prismaServiceMock.users.findMany.mockResolvedValue(users);

      const result = await service.findByPseudoOrEmail('user', 'me');

      expect(result).toHaveLength(2);
      expect(prismaServiceMock.users.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          id: { not: 'me' },
          pseudo: { contains: 'user', mode: 'insensitive' },
        },
        select,
        orderBy: { pseudo: 'asc' },
        take: 10,
      });
    });

    it("ne cherche un email qu'en correspondance exacte (pas d'énumération par sous-chaîne)", async () => {
      prismaServiceMock.users.findMany.mockResolvedValue([]);

      await service.findByPseudoOrEmail('  Ami@Example.com ', 'me');

      expect(prismaServiceMock.users.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          id: { not: 'me' },
          email: { equals: 'Ami@Example.com', mode: 'insensitive' },
        },
        select,
        orderBy: { pseudo: 'asc' },
        take: 10,
      });
    });

    it("ne renvoie jamais l'email", async () => {
      prismaServiceMock.users.findMany.mockResolvedValue([]);

      await service.findByPseudoOrEmail('user', 'me');

      const [args] = prismaServiceMock.users.findMany.mock.calls[0];
      expect(args.select).not.toHaveProperty('email');
    });

    it("ne lance pas de requête pour moins de 2 caractères", async () => {
      const result = await service.findByPseudoOrEmail('u', 'me');

      expect(result).toEqual([]);
      expect(prismaServiceMock.users.findMany).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('est un alias de findByPseudoOrEmail', async () => {
      const users = [{ id: '1', pseudo: 'user1', avatar_url: null }];
      prismaServiceMock.users.findMany.mockResolvedValue(users);

      const result = await service.search('user1', 'me');

      expect(result).toEqual(users);
    });
  });

  describe('delete', () => {
    it('supprime l’utilisateur', async () => {
      prismaServiceMock.users.delete.mockResolvedValue({});

      await service.delete('user-id');

      expect(prismaServiceMock.users.delete).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
    });

    it('propage l’erreur si l’utilisateur n’existe pas', async () => {
      prismaServiceMock.users.delete.mockRejectedValue(new Error('No user found'));

      await expect(service.delete('nonexistent')).rejects.toThrow('No user found');
    });
  });
});
