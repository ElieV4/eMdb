import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Charge le .env de la racine monorepo pour que Prisma voie DATABASE_URL
// même quand @emdb/db est importé depuis apps/api ou apps/worker.
//
// `__dirname` varie selon que ce module est chargé depuis sa source TS
// (packages/db/, ex. via un import mappé par tsconfig `paths`) ou depuis
// son build compilé (packages/db/dist/, ex. quand @emdb/db est résolu par
// résolution Node standard via le symlink de workspace — c'est le cas
// d'apps/worker en dev, qui tourne via `ts-node-dev --transpile-only`
// sans `tsconfig-paths/register` et charge donc le `dist` compilé). Un
// seul niveau de différence, donc on essaie les deux profondeurs plutôt
// que de supposer laquelle s'applique (bug constaté : DATABASE_URL
// absent silencieusement pour tout job trakt-import lancé depuis le
// worker, qui échouait en cours de traitement).
const envCandidates = [
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '.env'),
];
const envPath = envCandidates.find((p) => fs.existsSync(p));
dotenv.config(envPath ? { path: envPath } : undefined);

// Singleton : évite d'ouvrir une nouvelle pool de connexions Postgres
// à chaque import de @emdb/db dans apps/api ou apps/worker.
export const prisma = new PrismaClient();

// Réexporte les types générés par Prisma (Title, User, etc.) pour que
// apps/api et apps/worker puissent les importer directement depuis @emdb/db.
export * from '@prisma/client';

// Fonctions PL/pgSQL (Phase 1.3) — à exposer côté API
// Ces fonctions appellent les fonctions PostgreSQL définies dans packages/db/sql/db_init.sql
export * from './src/functions';
