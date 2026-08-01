const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const TRAKT_EXPORT_DIR = 'C:\\Users\\Elie\\Downloads\\trakt-export-emdb';
const USER_EMAIL = 'elie.vincent4@gmail.com';
const DATABASE_URL = 'postgresql://emdb:emdb@localhost:5432/emdb';

const prisma = new PrismaClient({
  datasources: {
    db: { url: DATABASE_URL },
  },
});

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

async function findTitleByTmdb(tmdbId) {
  return prisma.titles.findUnique({
    where: { tmdb_id: tmdbId },
    select: { id: true, type: true },
  });
}

async function findEpisodeByTmdb(showTmdbId, seasonNumber, episodeNumber) {
  const title = await findTitleByTmdb(showTmdbId);
  if (!title || title.type !== 'serie') return null;

  const season = await prisma.seasons.findFirst({
    where: { title_id: title.id, numero: seasonNumber },
    select: { id: true },
  });
  if (!season) return null;

  const episode = await prisma.episodes.findFirst({
    where: { season_id: season.id, numero: episodeNumber },
    select: { id: true },
  });
  if (!episode) return null;

  return episode.id;
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
        if (item.type === 'movie') {
          const tmdbId = item.movie?.ids?.tmdb;
          if (!tmdbId) { skipCount++; continue; }
          const title = await findTitleByTmdb(tmdbId);
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
        } else if (item.type === 'episode') {
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
          const title = await findTitleByTmdb(tmdbId);
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
          const title = await findTitleByTmdb(tmdbId);
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
          const title = await findTitleByTmdb(tmdbId);
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
          const title = await findTitleByTmdb(showTmdbId);
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
      if (item.movie?.ids?.tmdb) {
        tmdbId = item.movie.ids.tmdb;
      } else if (item.show?.ids?.tmdb) {
        tmdbId = item.show.ids.tmdb;
      } else if (item.episode?.ids?.tmdb) {
        tmdbId = item.episode.ids.tmdb;
      }

      if (!tmdbId) { skipCount++; continue; }

      const title = await findTitleByTmdb(tmdbId);
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
        const title = await findTitleByTmdb(tmdbId);
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

  await importWatches(userId);
  await importWatchedMovies(userId);
  await importRatings(userId);
  await importList(userId, 'Watchlist', 'watchlist', 'lists-watchlist.json');
  await importList(userId, 'Collection', 'collection', 'collection-movies.json');
  await importList(userId, 'Collection shows', 'collection', 'collection-shows.json');
  await importList(userId, 'Collection episodes', 'collection', 'collection-episodes.json');

  console.log('Import completed.');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
