/**
 * Vide la file BullMQ "recommendations" en prod (jobs en attente/actifs/en
 * échec) — nécessaire après le fix du 2026-09-03 (commit 788bbb5) car un
 * job "compute-recommendations-startup" ajouté par une version précédente
 * du code reste dans Redis même après un nouveau déploiement : le worker
 * le reprend au démarrage, retente le calcul O(N²) qui fait planter
 * l'instance (OOM), et comme le job repasse en "waiting" après le crash
 * (stalled job recovery de BullMQ), ça boucle indéfiniment — indépendamment
 * du code actuellement déployé.
 *
 * Usage (PowerShell, depuis apps/worker) :
 *   $env:REDIS_URL = "rediss://default:XXXX@xxxxx.upstash.io:6379"
 *   node scripts/clean-recommendations-queue.js
 */
const { Queue } = require('bullmq');
const Redis = require('ioredis');

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('REDIS_URL manquant. Voir usage en haut du fichier.');
    process.exit(1);
  }

  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue('recommendations', { connection });

  const counts = await queue.getJobCounts();
  console.log('Avant nettoyage :', counts);

  // force:true car un job peut être "active" (repris par un worker qui a
  // ensuite planté) — obliterate vide entièrement la file, y compris le
  // job scheduler du cron mensuel, qui sera recréé proprement au prochain
  // démarrage du worker (scheduleMonthlyRecs).
  await queue.obliterate({ force: true });

  const after = await queue.getJobCounts();
  console.log('Après nettoyage :', after);

  await queue.close();
  await connection.quit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
