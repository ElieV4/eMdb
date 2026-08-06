const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { prisma } = require('@emdb/db');
const { importCreditsForTitle } = require('@emdb/tmdb-sync');

const USER_EMAIL = 'elie.vincent4@gmail.com';
const CREDIT_FILTER = ['acteur', 'realisateur'];
const MAX_RETRIES = 3;
const BATCH_SIZE = 100; // Nombre de titres par batch

// ————————————————————————————————————————————————————————————————
// Utilitaires
// ————————————————————————————————————————————————————————————————

class ProgressBar {
  constructor(label, total) {
    this.label = label;
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
    this.render();
  }

  tick() {
    this.current++;
    this.render();
  }

  render() {
    const pct = this.total > 0 ? (this.current / this.total) * 100 : 0;
    const barWidth = 30;
    const filled = Math.round((pct / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const eta = this.current > 0
      ? ((this.total - this.current) * (Date.now() - this.startTime) / this.current / 1000).toFixed(0)
      : '?';
    process.stdout.write(
      `\r${this.label} [${bar}] ${pct.toFixed(0)}% (${this.current}/${this.total}) ⏱ ${elapsed}s écoulées, ~${eta}s restantes`,
    );
  }

  done() {
    process.stdout.write('\n');
  }
}

async function withRetry(fn, context = '') {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      const isNetworkError =
        !e.message?.includes('404') &&
        !e.message?.includes('401') &&
        !e.message?.includes('TMDB unauthorized');
      if (attempt >= MAX_RETRIES || !isNetworkError) {
        throw e;
      }
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`  ⚠ Retry ${attempt}/${MAX_RETRIES} pour ${context}: ${e.message} (attente ${delay}ms)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ————————————————————————————————————————————————————————————————
// Récupération des titres de l'utilisateur
// ————————————————————————————————————————————————————————————————

/**
 * Récupère tous les titres (films + séries) avec lesquels l'utilisateur a
 * interagi (watches, ratings, lists), groupés par année de première interaction.
 */
async function getUserTitlesByYear(userId) {
  console.log('Récupération des titres de l\'utilisateur...');

  // Récupérer toutes les interactions avec dates
  const [watches, ratings, listItems] = await Promise.all([
    // Watches avec date
    prisma.user_watches.findMany({
      where: { user_id: userId },
      select: {
        title_id: true,
        episode_id: true,
        date_vue: true,
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            type: true,
            titre_vf: true,
            titre_vo: true,
          },
        },
      },
    }),
    // Ratings (pas de date de rating dans le schema, on utilise la date de création)
    prisma.user_ratings.findMany({
      where: { user_id: userId },
      select: {
        title_id: true,
        episode_id: true,
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            type: true,
            titre_vf: true,
            titre_vo: true,
          },
        },
      },
    }),
    // List items (pas de date, on utilise la date de création de la liste)
    prisma.list_items.findMany({
      where: {
        user_lists: {
          user_id: userId,
        },
      },
      select: {
        title_id: true,
        user_lists: {
          select: {
            created_at: true,
          },
        },
        titles: {
          select: {
            id: true,
            tmdb_id: true,
            type: true,
            titre_vf: true,
            titre_vo: true,
          },
        },
      },
    }),
  ]);

  // Map pour stocker les titres uniques avec leur année de première interaction
  const titleMap = new Map(); // titleId -> { tmdbId, type, titre, year }

  // Traiter les watches (avec date)
  for (const watch of watches) {
    if (!watch.titles || !watch.titles.tmdb_id) continue;
    const titleId = watch.title_id || watch.episode_id; // Utiliser title_id si disponible
    if (!titleId) continue;

    const year = watch.date_vue ? new Date(watch.date_vue).getFullYear() : null;
    if (!titleMap.has(titleId)) {
      titleMap.set(titleId, {
        tmdbId: watch.titles.tmdb_id,
        type: watch.titles.type,
        titre: watch.titles.titre_vf ?? watch.titles.titre_vo,
        year: year,
      });
    } else if (year && (!titleMap.get(titleId).year || year < titleMap.get(titleId).year)) {
      titleMap.get(titleId).year = year;
    }
  }

  // Traiter les ratings
  for (const rating of ratings) {
    if (!rating.titles || !rating.titles.tmdb_id) continue;
    const titleId = rating.title_id || rating.episode_id;
    if (!titleId) continue;

    if (!titleMap.has(titleId)) {
      titleMap.set(titleId, {
        tmdbId: rating.titles.tmdb_id,
        type: rating.titles.type,
        titre: rating.titles.titre_vf ?? rating.titles.titre_vo,
        year: null, // Pas de date de rating disponible
      });
    }
  }

  // Traiter les list items
  for (const item of listItems) {
    if (!item.titles || !item.titles.tmdb_id) continue;
    const year = item.user_lists?.created_at ? new Date(item.user_lists.created_at).getFullYear() : null;

    if (!titleMap.has(item.title_id)) {
      titleMap.set(item.title_id, {
        tmdbId: item.titles.tmdb_id,
        type: item.titles.type,
        titre: item.titles.titre_vf ?? item.titles.titre_vo,
        year: year,
      });
    } else if (year && (!titleMap.get(item.title_id).year || year < titleMap.get(item.title_id).year)) {
      titleMap.get(item.title_id).year = year;
    }
  }

  // Grouper par année
  const byYear = new Map(); // year -> [{ titleId, tmdbId, type, titre }]
  const noYear = [];

  for (const [titleId, data] of titleMap.entries()) {
    if (data.year) {
      if (!byYear.has(data.year)) {
        byYear.set(data.year, []);
      }
      byYear.get(data.year).push({
        titleId,
        tmdbId: data.tmdbId,
        type: data.type,
        titre: data.titre,
      });
    } else {
      noYear.push({
        titleId,
        tmdbId: data.tmdbId,
        type: data.type,
        titre: data.titre,
      });
    }
  }

  // Trier les années par ordre décroissant
  const sortedYears = Array.from(byYear.keys()).sort((a, b) => b - a);

  console.log(`  ${titleMap.size} titres uniques trouvés`);
  console.log(`  ${sortedYears.length} années avec interactions`);
  if (noYear.length > 0) {
    console.log(`  ${noYear.length} titres sans année d'interaction`);
  }

  return {
    byYear,
    noYear,
    sortedYears,
  };
}

// ————————————————————————————————————————————————————————————————
// Import des credits
// ————————————————————————————————————————————————————————————————

async function importCreditsForTitles(titles, batchName) {
  if (titles.length === 0) return { imported: 0, failed: 0 };

  console.log(`\n${batchName}: ${titles.length} titres`);
  const progressBar = new ProgressBar(`  ${batchName}`, titles.length);

  let imported = 0;
  let failed = 0;

  // Traiter par batch pour éviter de surcharger
  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);

    for (const { titleId, tmdbId, type, titre } of batch) {
      try {
        await withRetry(
          () =>
            importCreditsForTitle(titleId, {
              creditFilter: CREDIT_FILTER,
              skipWikidata: true,
            }),
          `importCreditsForTitle(${titleId}, ${titre})`,
        );
        imported++;
      } catch (e) {
        console.warn(`\n  Échec pour "${titre}" (tmdb=${tmdbId}): ${e.message}`);
        failed++;
      }
      progressBar.tick();
    }

    // Petite pause entre les batches
    if (i + BATCH_SIZE < titles.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  progressBar.done();
  console.log(`  ${batchName}: ${imported} importés, ${failed} échecs`);

  return { imported, failed };
}

// ————————————————————————————————————————————————————————————————
// Main
// ————————————————————————————————————————————————————————————————

async function main() {
  const user = await prisma.users.findUnique({
    where: { email: USER_EMAIL },
    select: { id: true },
  });

  if (!user) {
    console.error(`Utilisateur avec email ${USER_EMAIL} introuvable.`);
    process.exit(1);
  }

  const userId = user.id;
  console.log(`Import des credits pour ${USER_EMAIL} (${userId})\n`);

  // Récupérer tous les titres de l'utilisateur
  const { byYear, noYear, sortedYears } = await getUserTitlesByYear(userId);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  IMPORT DES CREDITS PAR BATCH');
  console.log('═══════════════════════════════════════════════════');

  // Afficher les statistiques par année
  console.log('\nTitres par année de première interaction :');
  for (const year of sortedYears) {
    const count = byYear.get(year)?.length || 0;
    console.log(`  ${year}: ${count} titres`);
  }
  if (noYear.length > 0) {
    console.log(`  Sans année: ${noYear.length} titres`);
  }

  // Demander quelle(s) année(s) importer
  console.log('\nOptions :');
  console.log('  - Entrez une année spécifique (ex: 2023)');
  console.log('  - Entrez "all" pour toutes les années');
  console.log('  - Entrez "recent" pour les 5 dernières années');
  console.log('  - Entrez "batch" pour traiter année par année');
  console.log('  - Entrez "none" pour ne traiter que les titres sans année');

  // Pour automatisation, on peut utiliser un argument en ligne de commande
  const arg = process.argv[2];
  let yearsToProcess = [];

  if (arg === 'all') {
    yearsToProcess = sortedYears;
    console.log(`\n→ Traitement de toutes les années (${yearsToProcess.length} années)`);
  } else if (arg === 'recent') {
    yearsToProcess = sortedYears.slice(0, 5);
    console.log(`\n→ Traitement des 5 dernières années: ${yearsToProcess.join(', ')}`);
  } else if (arg === 'batch') {
    console.log('\n→ Traitement année par année');
    for (const year of sortedYears) {
      const titles = byYear.get(year) || [];
      if (titles.length === 0) continue;

      console.log(`\n--- Année ${year} (${titles.length} titres) ---`);
      const response = await askQuestion(`  Importer les credits pour ${year}? (y/n/all/quit): `);

      if (response === 'quit') {
        console.log('Import interrompu par l\'utilisateur.');
        break;
      } else if (response === 'all') {
        // Traiter toutes les années restantes
        const yearIndex = sortedYears.indexOf(year);
        yearsToProcess = sortedYears.slice(yearIndex);
        for (const y of yearsToProcess) {
          const t = byYear.get(y) || [];
          await importCreditsForTitles(t, `Année ${y}`);
        }
        break;
      } else if (response === 'y') {
        await importCreditsForTitles(titles, `Année ${year}`);
      }
    }
    // Traiter les titres sans année à la fin
    if (noYear.length > 0) {
      console.log(`\n--- Titres sans année (${noYear.length} titres) ---`);
      await importCreditsForTitles(noYear, 'Sans année');
    }
    console.log('\nImport terminé.');
    await prisma.$disconnect();
    return;
  } else if (arg === 'none') {
    yearsToProcess = [];
    console.log('\n→ Traitement uniquement des titres sans année');
  } else if (arg && !isNaN(arg)) {
    const year = parseInt(arg);
    if (byYear.has(year)) {
      yearsToProcess = [year];
      console.log(`\n→ Traitement de l'année ${year}`);
    } else {
      console.log(`\n→ Aucun titre trouvé pour l'année ${year}`);
      await prisma.$disconnect();
      return;
    }
  } else {
    // Par défaut, traiter toutes les années
    yearsToProcess = sortedYears;
    console.log(`\n→ Traitement de toutes les années (${yearsToProcess.length} années)`);
  }

  // Traiter les années sélectionnées
  let totalImported = 0;
  let totalFailed = 0;

  for (const year of yearsToProcess) {
    const titles = byYear.get(year) || [];
    const result = await importCreditsForTitles(titles, `Année ${year}`);
    totalImported += result.imported;
    totalFailed += result.failed;
  }

  // Traiter les titres sans année si demandé
  if (arg === 'all' || arg === 'recent' || !arg) {
    if (noYear.length > 0) {
      const result = await importCreditsForTitles(noYear, 'Sans année');
      totalImported += result.imported;
      totalFailed += result.failed;
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  RÉCAPITULATIF');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Credits importés  : ${totalImported}`);
  console.log(`  Échecs            : ${totalFailed}`);
  console.log('═══════════════════════════════════════════════════');

  await prisma.$disconnect();
}

// Fonction utilitaire pour poser une question (mode interactif)
function askQuestion(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });
}

main().catch((e) => {
  console.error('Erreur fatale:', e);
  process.exit(1);
});