import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { findArchiveOrgFilm, extractOfficialProviders, findFreeWatchLink } from './watch-links.util';
import { getMovieWatchProviders, getTvWatchProviders } from '@emdb/tmdb-client';

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

  // Sites "gratuits" whitelistés — configurables par l'utilisateur (table
  // free_watch_sites, cf. FreeWatchSitesModule pour le CRUD), recherche +
  // vérification (titre, année, hash d'affiche TMDB) via un algo générique,
  // cf. watch-links.util.ts pour le détail de la stratégie.
  @Get('watch-links/free')
  async findFreeWatchLinks(
    @Query('titreVo') titreVo: string,
    @Query('titreVf') titreVf?: string,
    @Query('type') type: 'film' | 'serie' = 'film',
    @Query('afficheUrl') afficheUrl?: string,
    @Query('anneeSortie') anneeSortie?: string,
    @Query('debug') debug?: string,
  ) {
    if (!titreVo) {
      return { links: [] };
    }

    const isDebug = debug === '1';
    const annee = anneeSortie ? parseInt(anneeSortie, 10) : undefined;
    const debugTraces: Record<string, string[]> = {};

    const sites = await this.prisma.free_watch_sites.findMany({ where: { actif: true } });

    const results = await Promise.all(
      sites.map(async (site) => {
        const trace = isDebug ? [] : undefined;
        try {
          const match = await findFreeWatchLink(
            site,
            {
              titreVo,
              titreVf,
              type,
              afficheUrl,
              anneeSortie: Number.isFinite(annee) ? annee : undefined,
            },
            trace,
          );
          if (trace) debugTraces[site.nom] = trace;
          // `verified` : false uniquement pour les liens devinés sans
          // confirmation possible (matchedBy 'unverified', cf.
          // watch-links.util.ts — sites bloquant les requêtes depuis Render).
          return match ? { name: site.nom, href: match.url, verified: match.matchedBy !== 'unverified' } : null;
        } catch (error) {
          if (trace) {
            trace.push(`EXCEPTION ${error instanceof Error ? error.message : String(error)}`);
            debugTraces[site.nom] = trace;
          }
          return null;
        }
      }),
    );

    return {
      links: results.filter(Boolean),
      ...(isDebug ? { debug: debugTraces } : {}),
    };
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
