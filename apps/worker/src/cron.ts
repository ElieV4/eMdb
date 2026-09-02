import { Queue } from 'bullmq';
import { prisma } from '@emdb/db';
import { RECOMMENDATIONS_QUEUE_NAME } from './recommendations.worker';
import { buildRedisConnection } from './worker';

export async function scheduleMonthlyRecs(redisUrl: string) {
  const queue = new Queue(RECOMMENDATIONS_QUEUE_NAME, {
    connection: buildRedisConnection(redisUrl),
  });

  await queue.upsertJobScheduler(
    'compute-recommendations-cron',
    { pattern: '0 3 1 * *' },
    { data: { mode: 'all' } },
  );

  // Auto-guérison : `upsertJobScheduler` ne rattrape jamais une occurrence
  // manquée (il programme seulement la PROCHAINE date correspondant au
  // pattern à partir de maintenant) — si le worker n'était pas up au moment
  // exact du cron mensuel (1er du mois, 3h), ou si la table vient d'être
  // vidée/jamais peuplée (premier déploiement), il faudrait sinon attendre
  // jusqu'à un mois entier sans aucune recommandation. On vérifie donc au
  // démarrage et on déclenche un calcul immédiat si la table est vide.
  const existing = await prisma.title_recommendations.count();
  if (existing === 0) {
    console.log('[worker] title_recommendations vide au démarrage — calcul immédiat déclenché');
    await queue.add('compute-recommendations-startup', { mode: 'all' });
  }
}
