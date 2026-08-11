import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { findArchiveOrgFilm, extractOfficialProviders } from './watch-links.util';
import { getMovieWatchProviders, getTvWatchProviders } from '@emdb/tmdb-client';

const ALLOWED_WATCH_LINK_HOSTS = new Set([
  'www.watchtv.click',
  'watchtv.click',
  'www.hydraflix.cc',
  'hydraflix.cc',
  'www.moviedb.wiki',
  'moviedb.wiki',
]);

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

  @Get('watch-links/validate')
  async validateWatchLink(@Query('url') url: string) {
    if (!url) {
      return { valid: false, status: 400 };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { valid: false, status: 400 };
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowed = [...ALLOWED_WATCH_LINK_HOSTS].some(
      (allowedHost) =>
        host === allowedHost || host.endsWith(`.${allowedHost}`),
    );

    if (!isAllowed) {
      return { valid: false, status: 403 };
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
      });
      return { valid: response.ok, status: response.status };
    } catch {
      return { valid: false, status: 0 };
    }
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
