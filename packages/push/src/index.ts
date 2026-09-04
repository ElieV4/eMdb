import * as admin from 'firebase-admin';
import { prisma } from '@emdb/db';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

let firebaseApp: admin.app.App | null | undefined;

/**
 * Lazy-init : évite de planter tout process qui importe @emdb/push (ex.
 * apps/api, qui n'envoie jamais de push) quand FIREBASE_SERVICE_ACCOUNT_JSON
 * n'est pas configuré en local.
 */
function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp !== undefined) return firebaseApp;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    firebaseApp = null;
    return firebaseApp;
  }

  const serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
  firebaseApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return firebaseApp;
}

/**
 * Envoie une notification push à tous les appareils enregistrés des users
 * donnés, via FCM. No-op silencieux si les credentials Firebase ne sont pas
 * configurées ou si aucun des users n'a de device enregistré.
 *
 * Purge automatiquement les tokens FCM devenus invalides (désinstall,
 * réinstall) pour ne pas les réessayer indéfiniment.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<{ sent: number }> {
  if (userIds.length === 0) return { sent: 0 };

  const app = getFirebaseApp();
  if (!app) {
    console.warn('[push] FIREBASE_SERVICE_ACCOUNT_JSON absent — envoi push ignoré.');
    return { sent: 0 };
  }

  const tokens = await prisma.push_tokens.findMany({
    where: { user_id: { in: userIds } },
    select: { token: true },
  });
  if (tokens.length === 0) return { sent: 0 };

  const response = await app.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
  });

  const staleTokens = response.responses
    .map((r, i) => (!r.success && r.error?.code === 'messaging/registration-token-not-registered' ? tokens[i].token : null))
    .filter((token): token is string => token !== null);

  if (staleTokens.length > 0) {
    await prisma.push_tokens.deleteMany({ where: { token: { in: staleTokens } } });
  }

  return { sent: response.successCount };
}
