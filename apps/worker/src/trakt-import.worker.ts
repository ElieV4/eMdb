import * as fs from 'node:fs';
import * as path from 'node:path';
import { Worker, JobScheduler, Job } from 'bullmq';
import { prisma } from '@emdb/db';
import { importTitleByTmdbId, importSeasonsForSerie } from '@emdb/tmdb-sync';
import { buildRedisConnection } from './worker';

export type TraktImportJobData = {
  userId: string;
  extractDir: string;
};

export type TraktImportProgress = {
  imported: number;
  total: number;
};

export type TraktImportResult = {
  watches: number;
  watchesSkipped: number;
  watchedMovies: number;
  watchedMoviesSkipped: number;
  ratings: number;
  ratingsSkipped: number;
  listsImported: number;
  titlesImported: number;
  titlesFailed: number;
};

export const TRAKT_IMPORT_QUEUE_NAME = 'trakt-import';

/**
 * Import Trakt en tâche de fond (bug #55/#56) — bouton "Importer depuis
 * Trakt" de la page Profil. Reprend la logique de `scripts/import-trakt.js`
 * (corrigée : déclenche l'import TMDB des titres absents du catalogue local
 * au lieu de les ignorer silencieusement) mais paramétrée par utilisateur/
 * dossier extrait, avec suivi de progression via `job.updateProgress()`.
 */
function loadJson(dir: string, fileName: string): any[] {
  const filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Pré-scan : collecte tous les tmdb_id (films/séries) référencés dans
 * l'export, pour connaître le total avant de commencer (utilisé pour le %
 * de progression). Un même titre compte une seule fois même s'il apparaît
 * dans plusieurs fichiers (historique + notes + listes).
 */
function collectReferencedTmdbIds(dir: string): { movieIds: Set<number>; showIds: Set<number> } {
  const movieIds = new Set<number>();
  const showIds = new Set<number>();

  for (let i = 1; i <= 50; i++) {
    for (const item of loadJson(dir, `watched-history-${i}.json`)) {
      if (item.action !== 'watch') continue;
      if (item.type === 'movie' && item.movie?.ids?.tmdb) movieIds.add(item.movie.ids.tmdb);
      if ((item.type === 'episode' || item.type === 'show') && item.show?.ids?.tmdb) {
        showIds.add(item.show.ids.tmdb);
      }
    }
    for (const item of loadJson(dir, `watched-movies-${i}.json`)) {
      if (item.movie?.ids?.tmdb) movieIds.add(item.movie.ids.tmdb);
    }
  }
  for (const item of loadJson(dir, 'ratings-movies.json')) {
    if (item.movie?.ids?.tmdb) movieIds.add(item.movie.ids.tmdb);
  }
  for (const item of loadJson(dir, 'ratings-shows.json')) {
    if (item.show?.ids?.tmdb) showIds.add(item.show.ids.tmdb);
  }
  for (const item of loadJson(dir, 'ratings-episodes.json')) {
    if (item.show?.ids?.tmdb) showIds.add(item.show.ids.tmdb);
  }
  for (const item of loadJson(dir, 'ratings-seasons.json')) {
    if (item.show?.ids?.tmdb) showIds.add(item.show.ids.tmdb);
  }
  for (const file of ['lists-watchlist.json', 'collection-movies.json', 'collection-shows.json', 'collection-episodes.json']) {
    for (const item of loadJson(dir, file)) {
      if (item.movie?.ids?.tmdb) movieIds.add(item.movie.ids.tmdb);
      if (item.show?.ids?.tmdb) showIds.add(item.show.ids.tmdb);
    }
  }

  return { movieIds, showIds };
}

async function runTraktImport(job: Job<TraktImportJobData>): Promise<TraktImportResult> {
  const { userId, extractDir } = job.data;

  const { movieIds, showIds } = collectReferencedTmdbIds(extractDir);
  const total = movieIds.size + showIds.size;
  let resolved = 0;
  let titlesImported = 0;
  let titlesFailed = 0;

  await job.updateProgress({ imported: 0, total } satisfies TraktImportProgress);

  const titleCache = new Map<string, { id: string; type: string } | null>();
  const toppedUpShows = new Set<string>();

  // `resolved` avance d'exactement 1 à chaque *premier* passage sur un
  // `cacheKey` (type:tmdb_id) donné, qu'il ait fallu l'importer ou qu'il
  // existait déjà localement — c'est ce comptage, identique à celui de
  // `collectReferencedTmdbIds()` pour `total`, qui garantit d'atteindre
  // 100 % en fin de parcours (chaque id référencé n'est résolu qu'une fois).
  async function findOrImportTitle(tmdbId: number, type: 'film' | 'serie') {
    const cacheKey = `${type}:${tmdbId}`;
    if (titleCache.has(cacheKey)) return titleCache.get(cacheKey) ?? null;

    let title: { id: string; type: string } | null = await prisma.titles.findUnique({
      where: { tmdb_id: tmdbId },
      select: { id: true, type: true },
    });

    if (!title) {
      try {
        title = await importTitleByTmdbId(tmdbId, type, { withCredits: true });
        titlesImported++;
      } catch {
        titlesFailed++;
        title = null;
      }
    }

    titleCache.set(cacheKey, title);
    resolved++;
    await job.updateProgress({ imported: resolved, total } satisfies TraktImportProgress);
    return title;
  }

  async function findEpisodeByTmdb(showTmdbId: number, seasonNumber: number, episodeNumber: number) {
    const title = await findOrImportTitle(showTmdbId, 'serie');
    if (!title || title.type !== 'serie') return null;

    let season = await prisma.seasons.findFirst({
      where: { title_id: title.id, numero: seasonNumber },
      select: { id: true },
    });
    let episode = season
      ? await prisma.episodes.findFirst({ where: { season_id: season.id, numero: episodeNumber }, select: { id: true } })
      : null;

    if (!episode && !toppedUpShows.has(title.id)) {
      toppedUpShows.add(title.id);
      try {
        await importSeasonsForSerie(title.id);
      } catch {
        return null;
      }
      season = await prisma.seasons.findFirst({ where: { title_id: title.id, numero: seasonNumber }, select: { id: true } });
      episode = season
        ? await prisma.episodes.findFirst({ where: { season_id: season.id, numero: episodeNumber }, select: { id: true } })
        : null;
    }

    return episode?.id ?? null;
  }

  // ---- Watches (historique) ----
  let watchCount = 0;
  let watchSkip = 0;
  for (let i = 1; i <= 50; i++) {
    for (const item of loadJson(extractDir, `watched-history-${i}.json`)) {
      if (item.action !== 'watch' || item.type === 'movie') continue;
      try {
        if (item.type === 'episode') {
          const showTmdbId = item.show?.ids?.tmdb;
          const seasonNumber = item.episode?.season;
          const episodeNumber = item.episode?.number;
          if (!showTmdbId || seasonNumber == null || episodeNumber == null) {
            watchSkip++;
            continue;
          }
          const episodeId = await findEpisodeByTmdb(showTmdbId, seasonNumber, episodeNumber);
          if (!episodeId) { watchSkip++; continue; }
          await prisma.user_watches.create({
            data: {
              user_id: userId,
              title_id: null,
              episode_id: episodeId,
              date_vue: item.watched_at ? new Date(item.watched_at) : new Date(),
            },
          });
          watchCount++;
        } else if (item.type === 'show') {
          const tmdbId = item.show?.ids?.tmdb;
          if (!tmdbId) { watchSkip++; continue; }
          const title = await findOrImportTitle(tmdbId, 'serie');
          if (!title) { watchSkip++; continue; }
          await prisma.user_watches.create({
            data: {
              user_id: userId,
              title_id: title.id,
              episode_id: null,
              date_vue: item.watched_at ? new Date(item.watched_at) : new Date(),
            },
          });
          watchCount++;
        }
      } catch {
        watchSkip++;
      }
    }
  }

  // ---- Watched movies ----
  let movieCount = 0;
  let movieSkip = 0;
  for (let i = 1; i <= 50; i++) {
    for (const item of loadJson(extractDir, `watched-movies-${i}.json`)) {
      try {
        const tmdbId = item.movie?.ids?.tmdb;
        if (!tmdbId) { movieSkip++; continue; }
        const title = await findOrImportTitle(tmdbId, 'film');
        if (!title) { movieSkip++; continue; }
        await prisma.user_watches.create({
          data: {
            user_id: userId,
            title_id: title.id,
            episode_id: null,
            date_vue: item.last_watched_at ? new Date(item.last_watched_at) : new Date(),
          },
        });
        movieCount++;
      } catch {
        movieSkip++;
      }
    }
  }

  // ---- Ratings ----
  let ratingCount = 0;
  let ratingSkip = 0;
  const ratingFiles: Array<{ file: string; type: 'movie' | 'show' | 'episode' | 'season' }> = [
    { file: 'ratings-movies.json', type: 'movie' },
    { file: 'ratings-shows.json', type: 'show' },
    { file: 'ratings-episodes.json', type: 'episode' },
    { file: 'ratings-seasons.json', type: 'season' },
  ];
  for (const { file, type } of ratingFiles) {
    for (const item of loadJson(extractDir, file)) {
      try {
        if (type === 'movie' || type === 'show') {
          const tmdbId = type === 'movie' ? item.movie?.ids?.tmdb : item.show?.ids?.tmdb;
          if (!tmdbId) { ratingSkip++; continue; }
          const title = await findOrImportTitle(tmdbId, type === 'movie' ? 'film' : 'serie');
          if (!title) { ratingSkip++; continue; }
          await prisma.user_ratings.upsert({
            where: { user_id_title_id: { user_id: userId, title_id: title.id } },
            create: { user_id: userId, title_id: title.id, episode_id: null, note_perso: item.rating, commentaire: null },
            update: { note_perso: item.rating, commentaire: null },
          });
          ratingCount++;
        } else if (type === 'episode') {
          const showTmdbId = item.show?.ids?.tmdb;
          const seasonNumber = item.episode?.season;
          const episodeNumber = item.episode?.number;
          if (!showTmdbId || seasonNumber == null || episodeNumber == null) { ratingSkip++; continue; }
          const episodeId = await findEpisodeByTmdb(showTmdbId, seasonNumber, episodeNumber);
          if (!episodeId) { ratingSkip++; continue; }
          await prisma.user_ratings.upsert({
            where: { user_id_episode_id: { user_id: userId, episode_id: episodeId } },
            create: { user_id: userId, title_id: null, episode_id: episodeId, note_perso: item.rating, commentaire: null },
            update: { note_perso: item.rating, commentaire: null },
          });
          ratingCount++;
        } else if (type === 'season') {
          const showTmdbId = item.show?.ids?.tmdb;
          const seasonNumber = item.season?.number;
          if (!showTmdbId || seasonNumber == null) { ratingSkip++; continue; }
          const title = await findOrImportTitle(showTmdbId, 'serie');
          if (!title) { ratingSkip++; continue; }
          const season = await prisma.seasons.findFirst({ where: { title_id: title.id, numero: seasonNumber }, select: { id: true } });
          if (!season) { ratingSkip++; continue; }
          const firstEpisode = await prisma.episodes.findFirst({ where: { season_id: season.id }, select: { id: true } });
          if (!firstEpisode) { ratingSkip++; continue; }
          await prisma.user_ratings.upsert({
            where: { user_id_episode_id: { user_id: userId, episode_id: firstEpisode.id } },
            create: { user_id: userId, title_id: null, episode_id: firstEpisode.id, note_perso: item.rating, commentaire: null },
            update: { note_perso: item.rating, commentaire: null },
          });
          ratingCount++;
        }
      } catch {
        ratingSkip++;
      }
    }
  }

  // ---- Listes ----
  async function importList(listName: string, type: string, fileName: string): Promise<number> {
    const data = loadJson(extractDir, fileName);
    if (data.length === 0) return 0;

    let list = await prisma.user_lists.findFirst({ where: { user_id: userId, nom: listName } });
    if (!list) {
      list = await prisma.user_lists.create({
        data: { user_id: userId, nom: listName, type, description: `Imported from Trakt ${listName}` },
      });
    }

    let itemCount = 0;
    let position = 0;
    for (const item of data) {
      try {
        let tmdbId: number | null = null;
        let itemType: 'film' | 'serie' = 'film';
        if (item.movie?.ids?.tmdb) {
          tmdbId = item.movie.ids.tmdb;
          itemType = 'film';
        } else if (item.show?.ids?.tmdb) {
          tmdbId = item.show.ids.tmdb;
          itemType = 'serie';
        } else if (item.episode?.ids?.tmdb && item.show?.ids?.tmdb) {
          tmdbId = item.show.ids.tmdb;
          itemType = 'serie';
        }
        if (!tmdbId) continue;

        const title = await findOrImportTitle(tmdbId, itemType);
        if (!title) continue;

        await prisma.list_items.upsert({
          where: { list_id_title_id: { list_id: list.id, title_id: title.id } },
          create: { list_id: list.id, title_id: title.id, position },
          update: {},
        });
        itemCount++;
        position++;
      } catch {
        // ignore, comptera comme non-importé
      }
    }
    return itemCount;
  }

  let listsImported = 0;
  listsImported += await importList('Watchlist', 'watchlist', 'lists-watchlist.json');
  listsImported += await importList('Collection', 'collection', 'collection-movies.json');
  listsImported += await importList('Collection shows', 'collection', 'collection-shows.json');
  listsImported += await importList('Collection episodes', 'collection', 'collection-episodes.json');

  // Toujours finir à 100 % même si certains tmdb_id référencés ne sont
  // jamais réellement rencontrés dans les fichiers parcourus (écarts
  // ponctuels entre le pré-scan et le parcours réel — ex. fichier
  // additionnel non couvert par le pré-scan).
  await job.updateProgress({ imported: total, total } satisfies TraktImportProgress);

  // Nettoyage du dossier temporaire d'extraction.
  try {
    fs.rmSync(extractDir, { recursive: true, force: true });
  } catch {
    // non bloquant
  }

  return {
    watches: watchCount,
    watchesSkipped: watchSkip,
    watchedMovies: movieCount,
    watchedMoviesSkipped: movieSkip,
    ratings: ratingCount,
    ratingsSkipped: ratingSkip,
    listsImported,
    titlesImported,
    titlesFailed,
  };
}

export function createTraktImportWorker(redisUrl: string) {
  const connection = buildRedisConnection(redisUrl);
  new JobScheduler(TRAKT_IMPORT_QUEUE_NAME, { connection });

  return new Worker<TraktImportJobData, TraktImportResult>(
    TRAKT_IMPORT_QUEUE_NAME,
    (job) => runTraktImport(job),
    {
      connection,
      concurrency: 1,
      lockDuration: 60 * 60 * 1000, // 1h — import complet potentiellement long
    },
  );
}
