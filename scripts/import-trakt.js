const path = require('path');
// Doit être chargé AVANT `require('@emdb/db')` : ce package charge lui aussi
// le .env racine, mais son chemin relatif (`__dirname/../../.env`) suppose
// une exécution depuis les sources TS ; une fois résolu via son build
// compilé (`dist/index.js`, un niveau plus profond), ce chemin pointe à côté
// de la racine et DATABASE_URL/TMDB_API_KEY restent vides. Charger le .env
// ici en premier le rend inoffensif (dotenv ne réécrit jamais une variable
// déjà définie).
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const fs = require('fs');
const { prisma } = require('@emdb/db');
const { importTitleByTmdbId, importSeasonsForSerie } = require('@emdb/tmdb-sync');

const TRAKT_EXPORT_DIR = 'C:\\Users\\Elie\\Downloads\\trakt-export-emdb';
const USER_EMAIL = 'elie.vincent4@gmail.com';
// bug : beaucoup de titres de l'export Trakt n'existaient pas encore dans le
// catalogue local -> déclenche désormais leur import TMDB à la volée au lieu
// de se contenter de les ignorer (cf. findOrImportTitle ci-dessous).
// Casting non importé ici (rafraîchissable ensuite titre par titre via le
// bouton "Actualiser") : sur ~1000 titres, l'import du casting représenterait
// à lui seul plusieurs dizaines de milliers d'appels TMDB.
const IMPORT_WITH_CREDITS = false;

async function loadJson(fileName) {
  const filePath = path.join(TRAKT_EXPORT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    console.warn(`  Failed to parse ${fileName}: ${e.message}`);
    return [];
  }
}

// Cache mémoire pour ce run : un même film/série peut apparaître des
// dizaines de fois entre l'historique, les notes et les listes — évite de
// refaire un lookup (voire un import TMDB) à chaque occurrence.
const titleCache = new Map();
// Séries déjà "topped up" (saisons/épisodes resynchronisés) durant ce run —
// évite de rappeler importSeasonsForSerie() pour chaque épisode manquant
// d'une même série déjà traitée.
const toppedUpShows = new Set();

let importedCount = 0;
let importFailCount = 0;

/**
 * Cherche un titre par tmdb_id ; s'il n'existe pas encore localement,
 * déclenche son import TMDB (même chemin que l'appli — genres/pays/studios/
 * saisons+épisodes pour les séries) avant de continuer. C'est ça qui
 * manquait : l'ancienne version se contentait d'un `findUnique` et ignorait
 * silencieusement tout titre absent du catalogue local.
 */
async function findOrImportTitle(tmdbId, type) {
  const cacheKey = `${type}:${tmdbId}`;
  if (titleCache.has(cacheKey)) return titleCache.get(cacheKey);

  let title = await prisma.titles.findUnique({
    where: { tmdb_id: tmdbId },
    select: { id: true, type: true, tmdb_id: true },
  });

  if (!title) {
    try {
      title = await importTitleByTmdbId(tmdbId, type, { withCredits: IMPORT_WITH_CREDITS });
      importedCount++;
      if (importedCount % 25 === 0) {
        console.log(`  ... ${importedCount} titres importés depuis TMDB jusqu'ici`);
      }
    } catch (e) {
      console.warn(`  Import TMDB échoué pour tmdb=${tmdbId} (${type}): ${e.message}`);
      importFailCount++;
      titleCache.set(cacheKey, null);
      return null;
    }
  }

  titleCache.set(cacheKey, title);
  return title;
}

async function findEpisodeByTmdb(showTmdbId, seasonNumber, episodeNumber) {
  const title = await findOrImportTitle(showTmdbId, 'serie');
  if (!title || title.type !== 'serie') return null;

  let season = await prisma.seasons.findFirst({
    where: { title_id: title.id, numero: seasonNumber },
    select: { id: true },
  });

  let episode = season
    ? await prisma.episodes.findFirst({
        where: { season_id: season.id, numero: episodeNumber },
        select: { id: true },
      })
    : null;

  // Saison/épisode absent alors que la série existe déjà localement :
  // souvent une série importée avant que cet épisode n'ait été (re)synchro
  // -> une seule resynchro par série et par run, puis on retente.
  if (!episode && !toppedUpShows.has(title.id)) {
    toppedUpShows.add(title.id);
    try {
      await importSeasonsForSerie(title.id);
    } catch (e) {
      console.warn(`  Resynchro saisons échouée pour titre=${title.id}: ${e.message}`);
      return null;
    }
    season = await prisma.seasons.findFirst({
      where: { title_id: title.id, numero: seasonNumber },
      select: { id: true },
    });
    episode = season
      ? await prisma.episodes.findFirst({
          where: { season_id: season.id, numero: episodeNumber },
          select: { id: true },
        })
      : null;
  }

  return episode?.id ?? null;
}

async function importWatches(userId) {
  const watchedHistoryFiles = [];
  for (let i = 1; i <= 50; i++) {
    const file = path.join(TRAKT_EXPORT_DIR, `watched-history-${i}.json`);
    if (fs.existsSync(file)) {
      watchedHistoryFiles.push(`watched-history-${i}.json`);
    }
  }

  console.log('Importing watches...');
  let watchCount = 0;
  let skipCount = 0;

  for (const file of watchedHistoryFiles) {
    const data = await loadJson(file);
    for (const item of data) {
      if (item.action !== 'watch') continue;

      // Skip movies here; they are imported from watched-movies-*.json
      if (item.type === 'movie') continue;

      try {
        if (item.type === 'episode') {
          const showTmdbId = item.show?.ids?.tmdb;
          const seasonNumber = item.episode?.season;
          const episodeNumber = item.episode?.number;
          if (!showTmdbId || seasonNumber == null || episodeNumber == null) {
            skipCount++;
            continue;
          }
          const episodeId = await findEpisodeByTmdb(showTmdbId, seasonNumber, episodeNumber);
          if (!episodeId) { skipCount++; continue; }
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
          if (!tmdbId) { skipCount++; continue; }
          const title = await findOrImportTitle(tmdbId, 'serie');
          if (!title) { skipCount++; continue; }
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
      } catch (e) {
        console.warn(`  Failed to create watch: ${e.message}`);
        skipCount++;
      }
    }
  }

  console.log(`  Watches: ${watchCount} imported, ${skipCount} skipped`);
}

async function importRatings(userId) {
  console.log('Importing ratings...');
  let ratingCount = 0;
  let skipCount = 0;

  const ratingFiles = [
    { file: 'ratings-movies.json', type: 'movie', idKey: 'movie' },
    { file: 'ratings-shows.json', type: 'show', idKey: 'show' },
    { file: 'ratings-episodes.json', type: 'episode', idKey: 'episode' },
    { file: 'ratings-seasons.json', type: 'season', idKey: 'season' },
  ];

  for (const { file, type, idKey } of ratingFiles) {
    const data = await loadJson(file);
    for (const item of data) {
      try {
        if (type === 'movie') {
          const tmdbId = item.movie?.ids?.tmdb;
          if (!tmdbId) { skipCount++; continue; }
          const title = await findOrImportTitle(tmdbId, 'film');
          if (!title) { skipCount++; continue; }
          await prisma.user_ratings.upsert({
            where: {
              user_id_title_id: { user_id: userId, title_id: title.id },
            },
            create: {
              user_id: userId,
              title_id: title.id,
              episode_id: null,
              note_perso: item.rating,
              commentaire: null,
            },
            update: {
              note_perso: item.rating,
              commentaire: null,
            },
          });
          ratingCount++;
        } else if (type === 'show') {
          const tmdbId = item.show?.ids?.tmdb;
          if (!tmdbId) { skipCount++; continue; }
          const title = await findOrImportTitle(tmdbId, 'serie');
          if (!title) { skipCount++; continue; }
          await prisma.user_ratings.upsert({
            where: {
              user_id_title_id: { user_id: userId, title_id: title.id },
            },
            create: {
              user_id: userId,
              title_id: title.id,
              episode_id: null,
              note_perso: item.rating,
              commentaire: null,
            },
            update: {
              note_perso: item.rating,
              commentaire: null,
            },
          });
          ratingCount++;
        } else if (type === 'episode') {
          const showTmdbId = item.show?.ids?.tmdb;
          const seasonNumber = item.episode?.season;
          const episodeNumber = item.episode?.number;
          if (!showTmdbId || seasonNumber == null || episodeNumber == null) {
            skipCount++;
            continue;
          }
          const episodeId = await findEpisodeByTmdb(showTmdbId, seasonNumber, episodeNumber);
          if (!episodeId) { skipCount++; continue; }
          await prisma.user_ratings.upsert({
            where: {
              user_id_episode_id: { user_id: userId, episode_id: episodeId },
            },
            create: {
              user_id: userId,
              title_id: null,
              episode_id: episodeId,
              note_perso: item.rating,
              commentaire: null,
            },
            update: {
              note_perso: item.rating,
              commentaire: null,
            },
          });
          ratingCount++;
        } else if (type === 'season') {
          const showTmdbId = item.show?.ids?.tmdb;
          const seasonNumber = item.season?.number;
          if (!showTmdbId || seasonNumber == null) { skipCount++; continue; }
          const title = await findOrImportTitle(showTmdbId, 'serie');
          if (!title) { skipCount++; continue; }
          const season = await prisma.seasons.findFirst({
            where: { title_id: title.id, numero: seasonNumber },
            select: { id: true },
          });
          if (!season) { skipCount++; continue; }
          const firstEpisode = await prisma.episodes.findFirst({
            where: { season_id: season.id },
            select: { id: true },
          });
          if (!firstEpisode) { skipCount++; continue; }
          await prisma.user_ratings.upsert({
            where: {
              user_id_episode_id: { user_id: userId, episode_id: firstEpisode.id },
            },
            create: {
              user_id: userId,
              title_id: null,
              episode_id: firstEpisode.id,
              note_perso: item.rating,
              commentaire: null,
            },
            update: {
              note_perso: item.rating,
              commentaire: null,
            },
          });
          ratingCount++;
        }
      } catch (e) {
        console.warn(`  Failed to create rating: ${e.message}`);
        skipCount++;
      }
    }
  }

  console.log(`  Ratings: ${ratingCount} imported, ${skipCount} skipped`);
}

async function importList(userId, listName, type, fileName) {
  const data = await loadJson(fileName);
  if (data.length === 0) {
    console.log(`  ${listName}: empty, skipping`);
    return;
  }

  console.log(`Importing ${listName}...`);

  let list = await prisma.user_lists.findFirst({
    where: { user_id: userId, nom: listName },
  });

  if (!list) {
    list = await prisma.user_lists.create({
      data: {
        user_id: userId,
        nom: listName,
        type: type,
        description: `Imported from Trakt ${listName}`,
      },
    });
  }

  let itemCount = 0;
  let skipCount = 0;

  for (const item of data) {
    try {
      let tmdbId = null;
      let itemType = 'film';
      if (item.movie?.ids?.tmdb) {
        tmdbId = item.movie.ids.tmdb;
        itemType = 'film';
      } else if (item.show?.ids?.tmdb) {
        tmdbId = item.show.ids.tmdb;
        itemType = 'serie';
      } else if (item.episode?.ids?.tmdb) {
        // Pas de type fiable pour un item "episode" isolé dans une liste :
        // on retombe sur le show parent s'il est présent, sinon on saute.
        tmdbId = item.show?.ids?.tmdb ?? null;
        itemType = 'serie';
      }

      if (!tmdbId) { skipCount++; continue; }

      const title = await findOrImportTitle(tmdbId, itemType);
      if (!title) { skipCount++; continue; }

      await prisma.list_items.upsert({
        where: {
          list_id_title_id: { list_id: list.id, title_id: title.id },
        },
        create: {
          list_id: list.id,
          title_id: title.id,
          position: itemCount,
        },
        update: {},
      });
      itemCount++;
    } catch (e) {
      console.warn(`  Failed to add item to ${listName}: ${e.message}`);
      skipCount++;
    }
  }

  console.log(`  ${listName}: ${itemCount} items imported, ${skipCount} skipped`);
}

async function importWatchedMovies(userId) {
  console.log('Importing watched movies...');
  let count = 0;
  let skipCount = 0;

  for (let i = 1; i <= 50; i++) {
    const file = `watched-movies-${i}.json`;
    const data = await loadJson(file);
    for (const item of data) {
      try {
        const tmdbId = item.movie?.ids?.tmdb;
        if (!tmdbId) { skipCount++; continue; }
        const title = await findOrImportTitle(tmdbId, 'film');
        if (!title) { skipCount++; continue; }
        const watchDate = item.last_watched_at ? new Date(item.last_watched_at) : new Date();
        await prisma.user_watches.create({
          data: {
            user_id: userId,
            title_id: title.id,
            episode_id: null,
            date_vue: watchDate,
          },
        });
        count++;
      } catch (e) {
        console.warn(`  Failed to create watch for movie: ${e.message}`);
        skipCount++;
      }
    }
  }

  console.log(`  Watched movies: ${count} imported, ${skipCount} skipped`);
}

async function main() {
  const user = await prisma.users.findUnique({
    where: { email: USER_EMAIL },
    select: { id: true },
  });

  if (!user) {
    console.error(`User with email ${USER_EMAIL} not found.`);
    process.exit(1);
  }

  const userId = user.id;
  console.log(`Importing Trakt data for user ${USER_EMAIL} (${userId})`);
  console.log(`Import TMDB avec casting: ${IMPORT_WITH_CREDITS}`);

  await importWatches(userId);
  await importWatchedMovies(userId);
  await importRatings(userId);
  await importList(userId, 'Watchlist', 'watchlist', 'lists-watchlist.json');
  await importList(userId, 'Collection', 'collection', 'collection-movies.json');
  await importList(userId, 'Collection shows', 'collection', 'collection-shows.json');
  await importList(userId, 'Collection episodes', 'collection', 'collection-episodes.json');

  console.log(`Import completed. ${importedCount} nouveaux titres importés depuis TMDB, ${importFailCount} échecs d'import.`);
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
