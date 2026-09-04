import { prisma } from '@emdb/db';
import { sendPushToUsers } from '@emdb/push';
import { getRecentEditions, getEditionSelection } from '@emdb/wikidata-client';

/**
 * Détecte les éditions de festivals/cérémonies (module "Sélection" de
 * Découvrir) dont la sélection vient d'être publiée, et notifie tous les
 * utilisateurs actifs — même mécanisme (ligne `notifications` + push FCM)
 * que `checkFollowedStudiosForNewTitles`/`checkFollowedPersonsForNewTitles`
 * (packages/tmdb-sync), à la différence près qu'il n'existe pas de relation
 * "suivi d'un festival" : la liste de festivals est curatée et commune à
 * tous les utilisateurs, donc diffusion globale plutôt que ciblée.
 *
 * Idempotent : une édition n'est notifiée qu'une fois, grâce à
 * `festival_editions_notified`.
 */
export async function checkFestivalSelections(): Promise<{ editionsNotified: number }> {
  const editions = await getRecentEditions();
  if (editions.length === 0) return { editionsNotified: 0 };

  const alreadyNotified = await prisma.festival_editions_notified.findMany({
    where: { edition_qid: { in: editions.map((e) => e.editionId) } },
    select: { edition_qid: true },
  });
  const notifiedIds = new Set(alreadyNotified.map((e) => e.edition_qid));
  const candidates = editions.filter((e) => !notifiedIds.has(e.editionId));
  if (candidates.length === 0) return { editionsNotified: 0 };

  let editionsNotified = 0;

  for (const edition of candidates) {
    let selection: Awaited<ReturnType<typeof getEditionSelection>>;
    try {
      selection = await getEditionSelection(edition.editionId);
    } catch (error) {
      console.warn(`[checkFestivalSelections] Échec requête sélection ${edition.editionId}:`, error);
      continue;
    }
    if (selection.length === 0) continue; // sélection pas encore publiée

    try {
      const activeUsers = await prisma.users.findMany({
        where: { status: 'active' },
        select: { id: true },
      });
      if (activeUsers.length > 0) {
        await prisma.notifications.createMany({
          data: activeUsers.map((u) => ({
            user_id: u.id,
            type: 'festival_selection',
            message: `La sélection ${edition.editionLabel} est disponible.`,
            lu: false,
          })),
        });
        await sendPushToUsers(
          activeUsers.map((u) => u.id),
          {
            title: edition.sourceNom,
            body: `La sélection ${edition.editionLabel} est disponible.`,
            data: { type: 'festival_selection', editionId: edition.editionId },
          },
        );
      }

      await prisma.festival_editions_notified.create({
        data: { edition_qid: edition.editionId, festival_nom: edition.sourceNom },
      });
      editionsNotified++;
    } catch (error) {
      console.warn(`[checkFestivalSelections] Échec notification/push (édition ${edition.editionId}):`, error);
    }
  }

  return { editionsNotified };
}
