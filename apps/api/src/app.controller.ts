import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import {
  findArchiveOrgFilm,
  extractOfficialProviders,
  findFreeWatchLink,
  FreeSiteKey,
} from './watch-links.util';
import { getMovieWatchProviders, getTvWatchProviders } from '@emdb/tmdb-client';

const FREE_SITES: { key: FreeSiteKey; name: string }[] = [
  { key: 'watchtv', name: 'WatchTV' },
  { key: 'hydraflix', name: 'HydraFlix' },
  { key: 'moviedbwiki', name: 'MovieDB Wiki' },
];

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'emdb-api' };
  }

  // Ping DB pour le workflow keep-alive (évite la mise en pause du projet
  // Supabase après 1 semaine d'inactivité, cf. docs/DEPLOIEMENT.md).
  @Get('health/db')
  async healthDb() {
    await this.prisma.$queryRawUnsafe('SELECT 1');
    return { status: 'ok', service: 'emdb-api', db: 'ok' };
  }

  // Recherche + vérification d'un film complet sur Internet Archive (VO ou
  // VF), utilisé uniquement pour les films (cf. apps/web TitleHero) — API
  // gratuite sans clé, contrairement à YouTube (quota trop faible pour une
  // validation à chaque visite de fiche film).
  @Get('watch-links/archive-org')
  async findArchiveOrgLink(
    @Query('titreVo') titreVo: string,
    @Query('titreVf') titreVf?: string,
    @Query('anneeSortie') anneeSortie?: string,
  ) {
    if (!titreVo) {
      return { found: false };
    }

    const annee = anneeSortie ? parseInt(anneeSortie, 10) : undefined;
    const match = await findArchiveOrgFilm({
      titreVo,
      titreVf,
      anneeSortie: Number.isFinite(annee) ? annee : undefined,
    });

    if (!match) {
      return { found: false };
    }

    return { found: true, url: match.url, label: match.label };
  }

  // Sites "gratuits" whitelistés (WatchTV, HydraFlix, MovieDB Wiki) —
  // recherche + vérification (titre, année, hash d'affiche TMDB), cf.
  // watch-links.util.ts pour le détail de la stratégie. Remplace l'ancienne
  // approche "URL devinée côté web, validée en HEAD" (bug #59 : slugs
  // parfois faux, pages "introuvable" renvoyées avec un statut 200).
  @Get('watch-links/free')
  async findFreeWatchLinks(
    @Query('titreVo') titreVo: string,
    @Query('titreVf') titreVf?: string,
    @Query('type') type: 'film' | 'serie' = 'film',
    @Query('afficheUrl') afficheUrl?: string,
    @Query('anneeSortie') anneeSortie?: string,
  ) {
    if (!titreVo) {
      return { links: [] };
    }

    const annee = anneeSortie ? parseInt(anneeSortie, 10) : undefined;
    const results = await Promise.all(
      FREE_SITES.map(async ({ key, name }) => {
        try {
          const match = await findFreeWatchLink(key, {
            titreVo,
            titreVf,
            type,
            afficheUrl,
            anneeSortie: Number.isFinite(annee) ? annee : undefined,
          });
          return match ? { name, href: match.url } : null;
        } catch {
          return null;
        }
      }),
    );

    return { links: results.filter(Boolean) };
  }

  // Plateformes de streaming officielles réellement disponibles pour ce
  // titre (TMDB watch/providers, données JustWatch) — évite d'afficher des
  // boutons vers des plateformes qui n'ont pas le titre.
  @Get('watch-links/providers')
  async getOfficialProviders(
    @Query('tmdbId') tmdbId: string,
    @Query('type') type: 'film' | 'serie',
    @Query('region') region = 'FR',
  ) {
    const id = parseInt(tmdbId, 10);
    if (!Number.isFinite(id)) {
      return { watchUrl: null, providers: [] };
    }

    try {
      const data =
        type === 'serie' ? await getTvWatchProviders(id) : await getMovieWatchProviders(id);
      return extractOfficialProviders(data, region);
    } catch {
      return { watchUrl: null, providers: [] };
    }
  }
}
