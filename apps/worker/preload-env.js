/**
 * Bascule DATABASE_URL vers WORKER_DATABASE_URL (rôle Postgres BYPASSRLS,
 * cf. wiki/Architecture#securite) avant que @emdb/db ne construise son
 * PrismaClient — doit être chargé via `-r` (require Node), donc avant tout
 * le reste du code du worker.
 *
 * Sans effet quand WorkerManagerService spawn ce process (déploiement cloud
 * embarqué) : il fait déjà cette bascule au niveau de l'env du process
 * enfant — cf. apps/api/src/admin/worker-manager.service.ts. Utile pour
 * `npm run dev:worker` / `start:prod` invoqués directement (hors docker-compose,
 * dont le service `worker` définit déjà DATABASE_URL sur le rôle superuser).
 *
 * Parseur .env minimal, pas de dépendance sur `dotenv` (package de
 * @emdb/db, pas de apps/worker) : évite de reposer sur le hoisting npm.
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1);
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(__dirname, '../../.env'));

if (process.env.WORKER_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.WORKER_DATABASE_URL;
}
