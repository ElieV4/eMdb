# @emdb/dbt-analytics

Projet dbt pour le module dataviz (`apps/api/src/dataviz`), à deux niveaux :

1. **`int_watches_enriched`** (vue, toujours à jour) — base commune qui résout episode → titre et la durée effective. Consommée **directement par l'endpoint live `GET /dataviz/query`** (le moteur d'exploration dynamique de la page Profil) : remplace un `LEFT JOIN episodes/seasons` + calcul de durée qui était dupliqué dans 8 requêtes SQL différentes du service. **C'est donc une dépendance de premier plan de l'app, pas seulement un détail interne dbt** — sans elle, la page Profil ne répond plus (500).
2. **8 marts `mart_watch_*`** — remplacent les anciennes vues matérialisées SQL brutes (`mv_watch_*`), utilisées par les endpoints legacy `getWatchTime`/`getWatchCount` (conservés pour compatibilité/tests, plus appelés par le frontend actuel). Reconstruits en tables par `dbt build`.

## Structure

```
models/
├── staging/        # 1:1 avec les tables sources (renommage, colonnes utiles uniquement)
├── intermediate/    # int_watches_enriched : jointure commune aux 8 marts
└── marts/dataviz/    # les 8 modèles finaux consommés par l'API
```

Lignage : `source(user_watches, titles, episodes, seasons)` → `stg_*` → `int_watches_enriched` → `mart_watch_*` (8 modèles).

## Pourquoi un alias sur chaque mart

Les fichiers sont nommés à l'idiome dbt (`mart_watch_time_by_genre`), mais chaque modèle déclare `config(alias='mv_watch_time_by_genre')` : l'objet physique créé en base garde le nom historique. L'API (`dataviz.service.ts`) continue de faire `SELECT * FROM mv_watch_time_by_genre` sans aucune modification — la bascule Prisma-raw-SQL → dbt est transparente côté application.

## Exécuter en local

```bash
python3 -m venv .venv && source .venv/bin/activate   # ou .venv\Scripts\activate sous Windows
pip install -r requirements.txt
cd ../..   # racine du monorepo
npm run dbt -- build          # run + test, équivalent à l'ancien refresh
npm run dbt -- docs generate  # génère la doc + le graphe de lignage
npm run dbt -- docs serve
```

`npm run dbt` (`scripts/run-dbt.js`) traduit `DATABASE_URL` (une seule chaîne, déjà utilisée partout ailleurs dans le repo) vers les champs `DBT_PG_*` attendus par `profiles.yml` — pas de configuration séparée à maintenir.

## En production

Le worker (`apps/worker/src/worker.ts`, job `refresh-materialized-views`) appelle `dbt build --select marts.dataviz` toutes les 3h au lieu d'exécuter `REFRESH MATERIALIZED VIEW CONCURRENTLY`. Si un test dbt échoue (ex. `duree_minutes` négative), le job échoue et remonte dans les logs — alerte immédiate au lieu d'une donnée silencieusement fausse.

Les images Docker (`apps/api/Dockerfile`, `apps/worker/Dockerfile`) installent dbt dans un virtualenv Python dédié (`/opt/dbt-venv`) au build.

## Tests

- Tests génériques (`not_null`, `unique`, `relationships`) déclarés dans les `_*.yml`
- Test singulier custom : `tests/assert_no_negative_watch_durations.sql`
