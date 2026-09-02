import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FreeWatchSitesService } from './free-watch-sites.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('../../watch-links.util', () => ({
  findFreeWatchLink: jest.fn(),
}));
import { findFreeWatchLink } from '../../watch-links.util';

const prismaServiceMock = {
  free_watch_sites: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('FreeWatchSitesService', () => {
  let service: FreeWatchSitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FreeWatchSitesService, { provide: PrismaService, useValue: prismaServiceMock }],
    }).compile();

    service = module.get<FreeWatchSitesService>(FreeWatchSitesService);
    jest.clearAllMocks();
  });

  const siteId = 'site-uuid';

  describe('list', () => {
    it('liste tous les sites triés par nom', async () => {
      prismaServiceMock.free_watch_sites.findMany.mockResolvedValue([]);
      await service.list();
      expect(prismaServiceMock.free_watch_sites.findMany).toHaveBeenCalledWith({
        orderBy: { nom: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('crée un site avec les champs optionnels par défaut', async () => {
      prismaServiceMock.free_watch_sites.create.mockResolvedValue({ id: siteId });

      await service.create({ nom: 'Exemple', url_recherche: 'https://exemple.com/?s={query}' });

      expect(prismaServiceMock.free_watch_sites.create).toHaveBeenCalledWith({
        data: {
          nom: 'Exemple',
          url_recherche: 'https://exemple.com/?s={query}',
          url_directe: null,
          selecteur_resultat: null,
          actif: true,
        },
      });
    });
  });

  describe('update', () => {
    it('met à jour un site existant', async () => {
      prismaServiceMock.free_watch_sites.findUnique.mockResolvedValue({ id: siteId });
      prismaServiceMock.free_watch_sites.update.mockResolvedValue({ id: siteId, nom: 'Nouveau nom' });

      const result = await service.update(siteId, { nom: 'Nouveau nom' });

      expect(result.nom).toBe('Nouveau nom');
      expect(prismaServiceMock.free_watch_sites.update).toHaveBeenCalledWith({
        where: { id: siteId },
        data: { nom: 'Nouveau nom' },
      });
    });

    it("lève NotFound si le site n'existe pas", async () => {
      prismaServiceMock.free_watch_sites.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { nom: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('supprime un site existant', async () => {
      prismaServiceMock.free_watch_sites.findUnique.mockResolvedValue({ id: siteId });
      await service.remove(siteId);
      expect(prismaServiceMock.free_watch_sites.delete).toHaveBeenCalledWith({ where: { id: siteId } });
    });

    it("lève NotFound si le site n'existe pas", async () => {
      prismaServiceMock.free_watch_sites.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('test', () => {
    it("lance l'algo sur la config fournie (pas forcément enregistrée) et renvoie le résultat + la trace", async () => {
      (findFreeWatchLink as jest.Mock).mockResolvedValue({
        url: 'https://exemple.com/inception/',
        matchedBy: 'poster',
      });

      const result = await service.test({
        url_recherche: 'https://exemple.com/?s={query}',
        titreVo: 'Inception',
        type: 'film',
      });

      expect(result).toEqual({
        found: true,
        url: 'https://exemple.com/inception/',
        matchedBy: 'poster',
        trace: expect.any(Array),
      });
      expect(findFreeWatchLink).toHaveBeenCalledWith(
        expect.objectContaining({ url_recherche: 'https://exemple.com/?s={query}' }),
        { titreVo: 'Inception', type: 'film', anneeSortie: undefined },
        expect.any(Array),
      );
      // Ne charge jamais de site par id — testable sans avoir été enregistré.
      expect(prismaServiceMock.free_watch_sites.findUnique).not.toHaveBeenCalled();
    });

    it("renvoie found=false si l'algo ne trouve rien", async () => {
      (findFreeWatchLink as jest.Mock).mockResolvedValue(null);

      const result = await service.test({
        url_recherche: 'https://exemple.com/?s={query}',
        titreVo: 'Inconnu',
        type: 'film',
      });

      expect(result.found).toBe(false);
      expect(result.url).toBeNull();
    });
  });
});
