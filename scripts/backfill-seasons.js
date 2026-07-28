const { PrismaClient } = require('@emdb/db');
const { importSeasonsForSerie } = require('@emdb/tmdb-sync');

async function main() {
  const prisma = new PrismaClient();

  try {
    const series = await prisma.titles.findMany({
      where: { type: 'serie' },
      select: { id: true, titre_vo: true, tmdb_id: true },
    });

    const withSeasons = await prisma.seasons.findMany({
      where: { title_id: { in: series.map(s => s.id) } },
      select: { title_id: true },
    });
    const withSeasonIds = new Set(withSeasons.map(s => s.title_id));

    const missing = series.filter(s => !withSeasonIds.has(s.id));

    console.log(`Series total: ${series.length}`);
    console.log(`Series with seasons: ${withSeasonIds.size}`);
    console.log(`Series missing seasons: ${missing.length}`);

    for (const serie of missing) {
      if (!serie.tmdb_id) {
        console.log(`Skipping ${serie.titre_vo}: no tmdb_id`);
        continue;
      }

      console.log(`Importing seasons for ${serie.titre_vo} (${serie.tmdb_id})...`);
      try {
        await importSeasonsForSerie(serie.id);
        console.log(`  Done`);
      } catch (error) {
        console.error(`  Failed:`, error.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
