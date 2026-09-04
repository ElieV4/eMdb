#!/usr/bin/env node
/**
 * Lance dbt (packages/dbt-analytics) en traduisant DATABASE_URL (une seule
 * chaine de connexion, deja utilisee partout ailleurs dans le repo) vers les
 * champs discrets attendus par un profil dbt-postgres (host/port/user/...).
 *
 * Usage : node scripts/run-dbt.js <commande dbt...>
 *   node scripts/run-dbt.js build --select marts.dataviz
 *   npm run dbt -- build
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[run-dbt] DATABASE_URL manquant.');
  process.exit(1);
}

const url = new URL(databaseUrl);
const dbtProjectDir = path.resolve(__dirname, '..', 'packages', 'dbt-analytics');
const dbtBin = process.env.DBT_BIN || 'dbt';

const result = spawnSync(
  dbtBin,
  [...process.argv.slice(2), '--project-dir', dbtProjectDir, '--profiles-dir', dbtProjectDir],
  {
    cwd: dbtProjectDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      DBT_PG_HOST: url.hostname,
      DBT_PG_PORT: url.port || '5432',
      DBT_PG_USER: decodeURIComponent(url.username),
      DBT_PG_PASSWORD: decodeURIComponent(url.password),
      DBT_PG_DBNAME: url.pathname.replace(/^\//, ''),
    },
  },
);

process.exit(result.status ?? 1);
