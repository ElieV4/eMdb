# Déploiement cloud (gratuit)

Ce document décrit comment eMDB est déployé en cloud, entièrement sur des offres gratuites, et comment l'administrer au quotidien.

## Vue d'ensemble

| Composant       | Service            | URL                       |
| --------------- | ------------------- | -------------------------- |
| Frontend (`apps/web`) | Vercel         | à compléter après création du projet |
| Backend (`apps/api` + workers) | Render (Web Service) | à compléter après création du service |
| Base de données | Supabase (Postgres)  | dashboard.supabase.com     |
| Redis (BullMQ)  | Upstash               | console.upstash.com        |
| Keep-alive      | cron-job.org          | console.cron-job.org       |

Le dev local (`docker-compose up -d`) n'est pas affecté par ce qui suit : il continue de tourner avec Postgres/Redis en conteneurs locaux et `api`/`worker` comme deux conteneurs séparés.

## Pourquoi un seul service Render (API + workers)

Les "background workers" Render dédiés ne sont plus gratuits (7$/mois min). Pour rester 100% gratuit, le service Render unique qui héberge `apps/api` lance aussi les workers BullMQ (`apps/worker`) **comme process enfant** au démarrage, quand la variable d'env `EMBED_WORKER=true` est positionnée (voir `apps/api/src/main.ts`). En local, `docker-compose.yml` force `EMBED_WORKER=false` sur le conteneur `api` : le conteneur `worker` reste séparé, comportement inchangé.

## Pourquoi le ping keep-alive

- **Render (free)** : le service se met en veille après 15 min sans trafic HTTP. Un ping toutes les 5 min le maintient éveillé en continu, ce qui reste largement sous le quota de 750h/mois du compte pour un seul service.
- **Supabase (free)** : le projet est mis en pause après 1 semaine sans requête DB. Le ping keep-alive tape aussi `/health/db` (une requête `SELECT 1`) pour l'éviter.
- Garder le service éveillé en continu a un effet de bord utile : les cron BullMQ internes du worker (sync TMDB quotidien/hebdo, notifications, recommandations mensuelles — voir `apps/worker/src/worker.ts` et `cron.ts`) se déclenchent normalement, sans avoir eu besoin de les réécrire en endpoints déclenchés manuellement.

**Pourquoi cron-job.org et pas GitHub Actions** : le déclencheur `schedule` de GitHub Actions n'est pas fiable à l'échelle de la minute — mesuré en pratique sur ce repo, l'intervalle réel entre deux exécutions était en moyenne de ~4h (jusqu'à 6h40) pour une configuration à 5 min, largement au-delà des 15 min de tolérance de Render. cron-job.org (gratuit, jusqu'à 1 min d'intervalle) est un service dédié à ce cas d'usage et respecte l'intervalle configuré.

## Provisionnement (à faire une fois)

### 1. Supabase (base de données)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Récupérer la connection string — **utiliser le "Session pooler" (IPv4)**, pas la connexion directe : depuis fin 2023 la connexion directe (port 5432 sur `db.<ref>.supabase.co`) est IPv6-only sauf add-on payant, et Render/la plupart des réseaux n'ont pas de sortie IPv6. Project Settings > Database > Connection string > onglet **Session pooler** :
   ```
   postgresql://postgres.<project-ref>:[PASSWORD]@aws-0-<région>.pooler.supabase.com:5432/postgres
   ```
   C'est cette chaîne qui sert de `SUPABASE_DB_URL` / `DATABASE_URL` partout (localement pour appliquer le schéma, et sur Render).
3. Appliquer le schéma (base vierge, pas de données à migrer) :
   ```bash
   npx prisma db execute --file packages/db/sql/db_init.sql --url "$SUPABASE_DB_URL"
   ```
   (pas de `psql` nécessaire — la CLI Prisma déjà présente dans le monorepo suffit.)
4. **Vérifier qu'il n'y a pas de dérive** entre `db_init.sql` et le schéma réellement utilisé par l'app (`packages/db/prisma/schema.prisma` peut avoir évolué sans que `db_init.sql` soit mis à jour en parallèle — c'est arrivé une fois, cf. commit `fix(db): synchroniser db_init.sql...`) :
   ```bash
   npx prisma db pull --schema=/tmp/verify.prisma  # avec DATABASE_URL=$SUPABASE_DB_URL
   diff packages/db/prisma/schema.prisma /tmp/verify.prisma
   ```
   Toute différence de colonne/type doit être corrigée dans `packages/db/sql/db_init.sql` (source de vérité pour un bootstrap neuf) puis réappliquée en base.
5. Générer le client Prisma en pointant sur cette base si besoin de vérifier :
   ```bash
   DATABASE_URL="$SUPABASE_DB_URL" npm run prisma:generate
   ```

### 2. Upstash (Redis)

1. Créer une base Redis sur [upstash.com](https://upstash.com) (région proche de celle choisie pour Render).
2. Récupérer l'URL `rediss://...` (TLS) — compatible telle quelle avec `ioredis`/BullMQ, aucun changement de code nécessaire.

### 3. Render (backend : API + workers)

1. Créer un Web Service sur [render.com](https://render.com), branché sur ce repo GitHub, Dockerfile = `apps/api/Dockerfile`.
2. Auto-deploy sur push `main` (activé par défaut).
3. Variables d'environnement à renseigner :
   - `DATABASE_URL` = connection string Supabase
   - `REDIS_URL` = URL Upstash (`rediss://...`)
   - `JWT_SECRET` = secret fort généré pour la prod (jamais celui du `.env` local)
   - `TMDB_API_KEY`, `TMDB_ACCESS_TOKEN`, `TMDB_BASE_URL`, `TMDB_IMAGE_BASE_URL`
   - `EMBED_WORKER` = `true`
   - `CORS_ORIGIN` = URL du frontend Vercel (ex. `https://emdb.vercel.app`)
   - `PORT` = `3001` (ou la valeur imposée par Render)
4. Une fois déployé, noter l'URL du service (ex. `https://emdb.onrender.com`).

### 4. Vercel (frontend)

1. Créer un projet sur [vercel.com](https://vercel.com), branché sur ce repo, root directory = `apps/web`.
2. Auto-deploy sur push `main` (activé par défaut).
3. Variable d'environnement : `NEXT_PUBLIC_API_URL` = URL Render.

### 5. Keep-alive cron-job.org

1. Créer un compte gratuit sur [cron-job.org](https://cron-job.org).
2. Créer deux cronjobs (Create cronjob) :
   - URL `https://emdb.onrender.com/health`, intervalle 5 minutes.
   - URL `https://emdb.onrender.com/health/db`, intervalle 5 minutes.
3. Laisser les réglages par défaut (timeout, notifications d'échec) — l'essentiel est l'intervalle.

Pas de variable de repo à configurer : les deux URLs sont saisies directement dans l'interface cron-job.org.

## Administration au quotidien

- **Redéployer** : `git push` sur `main` suffit (Render et Vercel redéploient automatiquement).
- **Voir les logs backend** : dashboard Render > le service > onglet "Logs" (affiche à la fois l'API et le worker embarqué, préfixé `[api]` / `[worker]`).
- **Voir les logs frontend** : dashboard Vercel > le projet > onglet "Deployments" > logs du build/runtime.
- **Forcer un job manuellement** : `POST /admin/compute-recommendations` sur l'URL Render (voir Swagger de l'API).
- **Si Supabase se met en pause** malgré le keep-alive (ex. après une interruption prolongée du ping) : dashboard Supabase > le projet > bouton "Restore"/"Unpause" — la base redémarre en quelques minutes.
- **Si le service Render semble down** : dashboard Render > "Manual Deploy" > "Clear build cache & deploy" en dernier recours.

## Limites des tiers gratuits à surveiller

| Service  | Quota                              | Où vérifier |
| -------- | ------------------------------------ | ----------- |
| Render   | 750h/mois cumulées (tous services)   | Dashboard > Billing |
| Supabase | 500 Mo de stockage DB                | Dashboard > Database > Usage |
| Upstash  | 500k commandes Redis/mois, 256 Mo    | Dashboard > la base > Usage |
| Vercel   | 100 Go bande passante/mois (hobby)   | Dashboard > Usage |

Si un quota approche sa limite, c'est le signal pour soit optimiser (réduire la fréquence du keep-alive, limiter la concurrency BullMQ), soit passer un composant précis sur un plan payant — pas besoin de tout migrer.
