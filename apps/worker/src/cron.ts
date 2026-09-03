import { Queue } from 'bullmq';
import { RECOMMENDATIONS_QUEUE_NAME } from './recommendations.worker';
import { buildRedisConnection } from './worker';

/**
 * REVERT (2026-09-03) : la version précédente déclenchait un calcul
 * immédiat au démarrage si `title_recommendations` était vide — en prod,
 * `computeTitleRecommendations()` (packages/recommender, O(N²) sur tout le
 * catalogue + un second PrismaClient dédié) a fait crasher le service
 * (probable OOM sur l'instance Render free 512 Mo), et comme le crash
 * survenait avant qu'aucun batch ne committe, la table restait vide à
 * chaque redémarrage — donc le déclenchement se representait à chaque
 * tentative : boucle de crash en continu (confirmée : "Instance failed"
 * répété toutes les quelques minutes dans l'Event timeline Render).
 *
 * Retour au cron mensuel simple le temps de rendre le calcul lui-même
 * moins gourmand (algorithme O(N²) + double PrismaClient à corriger) —
 * cf. packages/recommender/src/recommender.ts. Le déclenchement manuel
 * (`POST /admin/compute-recommendations`) reste disponible pour lancer un
 * calcul sous surveillance active plutôt qu'au démarrage sans contrôle.
 */
export async function scheduleMonthlyRecs(redisUrl: string) {
  const queue = new Queue(RECOMMENDATIONS_QUEUE_NAME, {
    connection: buildRedisConnection(redisUrl),
  });

  await queue.upsertJobScheduler(
    'compute-recommendations-cron',
    { pattern: '0 3 1 * *' },
    { data: { mode: 'all' } },
  );
}
