# Prisma — Configuration eMDB

Ce dossier contient le schéma Prisma (`schema.prisma`) et l'historique de migrations (`migrations/`) pour la base de données PostgreSQL.

---

## 🗃️ Schéma Prisma

`schema.prisma` est la **source de vérité** pour les tables, colonnes, index et relations. Les migrations dans `migrations/` sont générées à partir de ce fichier et appliquées séquentiellement pour reconstruire l'état de la base à n'importe quel point de son historique.

> ✅ **On modifie `schema.prisma` directement**, puis on génère une migration avec `prisma migrate dev` (voir workflow ci-dessous).

Prisma ne gère pas tout : l'extension `pgcrypto`, les triggers et fonctions PL/pgSQL restent définis en SQL brut dans `../sql/db_init.sql` (voir section "Objets SQL hors Prisma") ; les 8 tables dataviz (ex vues matérialisées) sont gérées par dbt (`packages/dbt-analytics`).

---

## 🔄 Workflow de migration

### Ajouter/modifier une table

```bash
# 1. Éditer packages/db/prisma/schema.prisma
# 2. Générer + appliquer la migration sur la base locale
npm run migrate:dev -- --name description_du_changement
```

Ceci crée un nouveau dossier dans `migrations/<timestamp>_description_du_changement/` avec le SQL généré, et l'applique immédiatement sur la base locale (`docker compose up -d`).

### Environnement local (nouvelle installation)

```bash
docker compose up -d          # PostgreSQL vierge (aucun schéma auto-appliqué)
npm run migrate:deploy         # applique tout l'historique de migrations
npm run apply:raw-sql           # extension, trigger, fonctions
npm run generate                 # client Prisma
npm run dbt -- build              # les 8 tables dataviz (racine du repo)
```

### Production (première fois)

Identique au local : `migrate:deploy`, `apply:raw-sql`, `dbt build`. Voir [wiki/Déploiement](../../../../wiki/Déploiement).

### Production (base déjà provisionnée avant l'introduction des migrations)

Si une base a été créée avant l'ajout de l'historique de migrations (via `db_init.sql` appliqué manuellement), elle a déjà le bon schéma mais ne connaît pas encore son historique de migrations. Il faut la "baseliner" (marquer les migrations comme déjà appliquées, sans réexécuter leur SQL) :

```bash
for m in prisma/migrations/*/; do
  npx prisma migrate resolve --applied "$(basename "$m")"
done
```

Puis vérifier : `npx prisma migrate status` doit répondre "Database schema is up to date!".

### Détection de dérive (CI)

La CI applique l'historique de migrations sur une base fraîche, puis compare le résultat à `schema.prisma` avec `prisma migrate diff --exit-code` — le build échoue si les deux divergent (ex. schéma modifié sans migration créée).

---

## 🔒 Row-Level Security (defense-in-depth)

Migration `enable_rls_user_scoped_tables` : policies RLS sur `user_watches`, `user_ratings`, `push_tokens`, `notifications`, `user_lists`, `list_items` — défense en profondeur en complément des contrôles d'autorisation déjà vérifiés au niveau service (ex. `ForbiddenException` dans `lists.service.ts`).

**Mécanisme** : `PrismaService.forUser(userId, fn)` déclare `set_config('app.user_id', userId, true)` (SET LOCAL, portée à la transaction) avant d'exécuter la requête ; `PrismaService.asSystem(fn)` déclare `app.bypass_rls = 'true'` pour les opérations légitimement transverses à tous les utilisateurs (stats admin, vérification avant suppression d'un titre, notification à l'admin). Sans contexte défini, la policy est fermée par défaut. Ces deux méthodes sont **indispensables** dès qu'un appel touche une des 6 tables ci-dessus — sinon la requête échoue silencieusement (rôle restreint) ou n'a aucun effet (superuser).

**Deux rôles Postgres distincts** (`packages/db/sql/setup_roles.sql`) :

- `emdb_app` (sans `BYPASSRLS`) : celui que l'API doit utiliser (`DATABASE_URL`), sinon les policies n'ont strictement aucun effet.
- Rôle d'origine (`emdb` en local, `postgres` sur Supabase, avec `BYPASSRLS`) : celui du worker (`WORKER_DATABASE_URL`), dont les jobs sont par nature transverses à tous les utilisateurs.

**⚠️ Supabase active RLS par défaut sur *toute* nouvelle table** (indépendamment de cette migration) — sans policy, ça bloque tout accès pour un rôle sans bypass. La migration `disable_default_rls_non_user_scoped_tables` désactive ce défaut sur les 21 autres tables (catalogue/techniques, pas de notion d'utilisateur).

### Statut production (Supabase)

**Fonctionne en local (connexion directe), pas encore en production.** Testé et validé de bout en bout en local (`rls-isolation.spec.ts`, + test manuel via l'API réelle) avec le rôle restreint. En production, basculer `DATABASE_URL` vers `emdb_app` provoque des rejets RLS (`42501`) sur les écritures pourtant légitimes (ex. créer une liste) — `pgbouncer=true` sur l'URL ne suffit pas à corriger ça. Suspicion : le pooler Supabase (Supavisor) filtre/ignore les `SET`/`set_config` sur des paramètres custom comme `app.user_id`, même en mode session. **Non résolu** — l'API en production reste donc sur le rôle d'origine (bypass), RLS actif côté base mais sans effet réel tant que ce point n'est pas éclairci (accès direct psql à Supabase nécessaire pour investiguer plus loin). Les policies elles-mêmes sont déjà appliquées sur Supabase (inertes tant que le rôle de connexion bypass).

---

## 🛠️ Objets SQL "Hors Prisma"

Prisma **ne gère pas** les objets suivants (extension `pgcrypto`, triggers, fonctions, vues matérialisées). Ils sont définis dans `../sql/db_init.sql` et appliqués via `npm run apply:raw-sql` (script `../scripts/apply-raw-sql.ts`, idempotent).

### 🎯 Triggers

| Nom                           | Table          | Description                                                                      |
| ----------------------------- | -------------- | -------------------------------------------------------------------------------- |
| `trg_user_ratings_updated_at` | `user_ratings` | Met à jour automatiquement `updated_at` à la date actuelle avant chaque `UPDATE` |

**Fonction associée** : `fn_set_updated_at()` (appelée par le trigger).

### 📊 Fonctions PL/pgSQL

| Nom                   | Paramètres                          | Retourne                                | Utilisation                                                        |
| --------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------- |
| `fn_episodes_non_vus` | `p_user_id UUID`, `p_title_id UUID` | `INT`                                   | Épisodes sortis et non vus par un utilisateur — calendrier         |
| `fn_progress_serie`   | `p_user_id UUID`, `p_title_id UUID` | `TABLE(saison INT, vus INT, total INT)` | Progrès par saison — page détail série                             |

**Exemple d'appel via Prisma** :

```typescript
const count = await prisma.$queryRaw<number>(
  `SELECT fn_episodes_non_vus('${userId}', '${titleId}')`,
);
```

### 📈 Vues dataviz (gérées par dbt)

8 objets (`mv_watch_time_by_*`, `mv_watch_count_by_*` — période/genre/pays/animation) : **plus définis dans `db_init.sql`**, mais par `packages/dbt-analytics` (modèles `marts/dataviz/mart_watch_*`, alias physique = nom historique). Rafraîchis toutes les 3h par le worker via `dbt build` (run + tests) au lieu de `REFRESH MATERIALIZED VIEW CONCURRENTLY`. Voir `packages/dbt-analytics/README.md`.

---

## 🔧 Scripts utiles

| Commande                  | Description                                                          |
| -------------------------- | ---------------------------------------------------------------------- |
| `npm run migrate:dev`      | Crée + applique une migration à partir des changements de `schema.prisma` |
| `npm run migrate:deploy`   | Applique l'historique de migrations (CI/prod/nouvel environnement)  |
| `npm run apply:raw-sql`    | Applique les objets SQL hors-Prisma (extension, trigger, fonctions) |
| `npm run dbt -- build` (racine) | Reconstruit + teste les 8 tables dataviz via dbt |
| `npm run generate`         | Génère le client Prisma                                              |
| `npm run db:refresh-mv` (racine) | Rafraîchit manuellement les vues matérialisées                |
| `npm run seed`             | Seed genres + pays                                                    |

---

## 📝 Bonnes pratiques

1. **Ne pas utiliser Prisma pour** : triggers, fonctions PL/pgSQL, vues matérialisées, contraintes CHECK complexes (ex. `chk_follow_is_serie`) — ces objets restent en SQL brut dans `db_init.sql`.
2. **Toute modification de table passe par une migration** (`migrate:dev`), jamais par une édition manuelle de la base ou un nouveau `db push`.
3. **Toujours tester** les requêtes raw SQL avec `prisma.$queryRaw` avant de les déployer.

---

## 🔗 Références

- [Documentation Prisma Migrate](https://pris.ly/d/migrate)
- [Raw SQL avec Prisma](https://pris.ly/d/prisma-client/raw-queries)
- [PostgreSQL — Vues matérialisées](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)
