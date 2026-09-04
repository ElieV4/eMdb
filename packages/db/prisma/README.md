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
