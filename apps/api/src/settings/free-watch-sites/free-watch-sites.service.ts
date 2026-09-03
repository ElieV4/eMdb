import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { findFreeWatchLink } from '../../watch-links.util';
import { CreateFreeWatchSiteDto } from './dto/create-free-watch-site.dto';
import { UpdateFreeWatchSiteDto } from './dto/update-free-watch-site.dto';
import { TestFreeWatchSiteDto } from './dto/test-free-watch-site.dto';

/**
 * CRUD de la whitelist des sites "gratuits" (table `free_watch_sites`,
 * partagée par tous les utilisateurs — pas de scoping par user_id).
 */
@Injectable()
export class FreeWatchSitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.free_watch_sites.findMany({ orderBy: { nom: 'asc' } });
  }

  async create(dto: CreateFreeWatchSiteDto) {
    return this.prisma.free_watch_sites.create({
      data: {
        nom: dto.nom,
        url_recherche: dto.url_recherche,
        url_directe: dto.url_directe ?? null,
        selecteur_resultat: dto.selecteur_resultat ?? null,
        actif: dto.actif ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFreeWatchSiteDto) {
    const site = await this.prisma.free_watch_sites.findUnique({ where: { id } });
    if (!site) {
      throw new NotFoundException('Site introuvable.');
    }
    return this.prisma.free_watch_sites.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    const site = await this.prisma.free_watch_sites.findUnique({ where: { id } });
    if (!site) {
      throw new NotFoundException('Site introuvable.');
    }
    await this.prisma.free_watch_sites.delete({ where: { id } });
  }

  /**
   * Lance l'algo sur un titre d'exemple pour une config donnée — sert le
   * bouton "tester" du formulaire, sur un brouillon en cours de saisie
   * comme sur un site déjà enregistré (config passée dans le body, jamais
   * chargée par id) : ces sites changent régulièrement de structure, un
   * aperçu immédiat évite d'avoir à sauvegarder "à l'aveugle" pour valider.
   */
  async test(dto: TestFreeWatchSiteDto) {
    const trace: string[] = [];
    const match = await findFreeWatchLink(
      {
        id: 'draft',
        nom: 'test',
        url_recherche: dto.url_recherche,
        url_directe: dto.url_directe ?? null,
        selecteur_resultat: dto.selecteur_resultat ?? null,
      },
      { titreVo: dto.titreVo, type: dto.type, anneeSortie: dto.anneeSortie, tmdbId: dto.tmdbId },
      trace,
    );

    return {
      found: !!match,
      url: match?.url ?? null,
      matchedBy: match?.matchedBy ?? null,
      trace,
    };
  }
}
