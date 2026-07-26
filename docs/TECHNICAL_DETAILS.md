# eMDB - Technical Details (Annexe)

_Documentation technique détaillée - Complément à l'Architecture Overview_
_Dernière mise à jour : 24 juillet 2026_

---

## 📋 Table des Matières

1. [Fichiers Sources par Module (Backend)](#-fichiers-sources-par-module)
2. [Fichiers Sources par Module (Frontend)](#-fichiers-sources-par-module-frontend)
3. [Tests](#-tests)

---

## 📁 Fichiers Sources par Module

### Module 1: Authentification (`apps/api/src/auth/`)

**Structure du module :**

```
auth/
├── auth.controller.ts          # Endpoints REST
├── auth.module.ts             # Configuration du module NestJS
├── auth.service.ts            # Logique métier
├── jwt.strategy.ts            # Stratégie Passport JWT
├── jwt-auth.guard.ts          # Guard de protection des routes
├── decorators/
│   └── current-user.decorator.ts  # Décorateur pour extraire l'utilisateur
└── dto/
    ├── login.dto.ts            # DTO de connexion
    ├── register.dto.ts         # DTO d'inscription
    └── refresh.dto.ts          # DTO de rafraîchissement token
```

**Fichiers sources (10 fichiers) :**

- `auth.controller.ts`
- `auth.module.ts`
- `auth.service.ts`
- `jwt.strategy.ts`
- `jwt-auth.guard.ts`
- `decorators/current-user.decorator.ts`
- `dto/login.dto.ts`
- `dto/register.dto.ts`
- `dto/refresh.dto.ts`

---

### Module 2: Utilisateurs (`apps/api/src/users/`)

**Structure du module :**

```
users/
├── users.controller.ts          # Endpoints REST
├── users.module.ts             # Configuration du module
├── users.service.ts            # Logique métier
└── dto/
    ├── search-users.dto.ts     # DTO de recherche
    ├── update-user.dto.ts      # DTO de mise à jour profil
    └── upload-avatar.dto.ts     # DTO upload avatar
```

**Fichiers sources (7 fichiers) :**

- `users.controller.ts`
- `users.module.ts`
- `users.service.ts`
- `dto/search-users.dto.ts`
- `dto/update-user.dto.ts`
- `dto/upload-avatar.dto.ts`

---

### Module 3: Titres (`apps/api/src/titles/`)

**Structure du module :**

```
titles/
├── titles.controller.ts          # Endpoints REST
├── titles.module.ts             # Configuration du module
├── titles.service.ts            # Logique métier
└── dto/
    ├── import-title.dto.ts      # DTO pour import depuis TMDB
    ├── list-titles-filter.dto.ts # DTO pour filtres de liste
    └── search-titles.dto.ts      # DTO pour recherche
```

**Fichiers sources (7 fichiers) :**

- `titles.controller.ts`
- `titles.module.ts`
- `titles.service.ts`
- `dto/import-title.dto.ts`
- `dto/list-titles-filter.dto.ts`
- `dto/search-titles.dto.ts`

---

### Module 4: Personnes (`apps/api/src/people/`)

**Structure du module :**

```
people/
├── people.controller.ts          # Endpoints REST
├── people.module.ts             # Configuration du module
├── people.service.ts            # Logique métier
└── dto/
    └── search-people.dto.ts      # DTO pour recherche
```

**Fichiers sources (5 fichiers) :**

- `people.controller.ts`
- `people.module.ts`
- `people.service.ts`
- `dto/search-people.dto.ts`

---

### Module 5: Saisons & Épisodes (`apps/api/src/seasons-episodes/`)

**Structure du module :**

```
seasons-episodes/
├── seasons-episodes.controller.ts  # Endpoints REST
├── seasons-episodes.module.ts     # Configuration du module
└── seasons-episodes.service.ts    # Logique métier
```

**Fichiers sources (3 fichiers) :**

- `seasons-episodes.controller.ts`
- `seasons-episodes.module.ts`
- `seasons-episodes.service.ts`

---

### Module 6: Credits (`apps/api/src/credits/`)

**Structure du module :**

```
credits/
├── credits.controller.ts    # Endpoints REST
├── credits.module.ts       # Configuration du module
└── credits.service.ts      # Logique métier
```

**Fichiers sources (3 fichiers) :**

- `credits.controller.ts`
- `credits.module.ts`
- `credits.service.ts`

---

### Module 7: Visionnages (`apps/api/src/watches/`)

**Structure du module :**

```
watches/
├── watches.controller.ts          # Endpoints REST
├── watches.module.ts             # Configuration du module
├── watches.service.ts            # Logique métier
└── dto/
    ├── create-watch.dto.ts        # DTO pour créer un visionnage
    ├── follow-serie.dto.ts        # DTO pour suivre une série
    └── list-watches-filter.dto.ts  # DTO pour filtres
```

**Fichiers sources (7 fichiers) :**

- `watches.controller.ts`
- `watches.module.ts`
- `watches.service.ts`
- `dto/create-watch.dto.ts`
- `dto/follow-serie.dto.ts`
- `dto/list-watches-filter.dto.ts`

---

### Module 8: Notations (`apps/api/src/ratings/`)

**Structure du module :**

```
ratings/
├── ratings.controller.ts          # Endpoints REST
├── ratings.module.ts             # Configuration du module
├── ratings.service.ts            # Logique métier
└── dto/
    ├── list-ratings-filter.dto.ts  # DTO pour filtres
    └── upsert-rating.dto.ts        # DTO pour upsert notation
```

**Fichiers sources (6 fichiers) :**

- `ratings.controller.ts`
- `ratings.module.ts`
- `ratings.service.ts`
- `dto/list-ratings-filter.dto.ts`
- `dto/upsert-rating.dto.ts`

---

### Module 9: Listes (`apps/api/src/lists/`)

**Structure du module :**

```
lists/
├── lists.controller.ts           # Endpoints REST
├── lists.module.ts              # Configuration du module
├── lists.service.ts             # Logique métier
└── dto/
    ├── add-item.dto.ts           # DTO pour ajouter un item
    ├── create-list.dto.ts        # DTO pour créer une liste
    ├── reorder.dto.ts             # DTO pour réordonner
    ├── share-list.dto.ts          # DTO pour partager
    └── update-list.dto.ts         # DTO pour mettre à jour
```

**Fichiers sources (10 fichiers) :**

- `lists.controller.ts`
- `lists.module.ts`
- `lists.service.ts`
- `dto/add-item.dto.ts`
- `dto/create-list.dto.ts`
- `dto/reorder.dto.ts`
- `dto/share-list.dto.ts`
- `dto/update-list.dto.ts`

---

### Module 10: Dataviz (`apps/api/src/dataviz/`)

**Structure du module :**

```
dataviz/
├── dataviz.controller.ts          # Endpoints REST
├── dataviz.module.ts             # Configuration du module
├── dataviz.service.ts            # Logique métier
└── dto/
    ├── watch-count-query.dto.ts   # DTO pour requêtes count
    └── watch-time-query.dto.ts    # DTO pour requêtes time
```

**Fichiers sources (7 fichiers) :**

- `dataviz.controller.ts`
- `dataviz.module.ts`
- `dataviz.service.ts`
- `dto/watch-count-query.dto.ts`
- `dto/watch-time-query.dto.ts`

---

### Module 11: Recommender (`apps/api/src/recommender/`)

**Structure du module :**

```
recommender/
├── recommender.module.ts       # Configuration du module NestJS
├── recommender.controller.ts   # Endpoints REST (3 endpoints)
├── recommender.service.ts      # Logique métier (BullMQ + stats)
├── recommender.config.ts       # Configuration BullMQ partagée
└── dto/
    ├── compute-recs.dto.ts     # DTO pour POST compute-recommendations
    └── job-status.dto.ts       # DTO pour réponse status job
```

**Fichiers sources (7 fichiers) :**

- `recommender.module.ts`
- `recommender.controller.ts`
- `recommender.service.ts`
- `recommender.config.ts`
- `dto/compute-recs.dto.ts`
- `dto/job-status.dto.ts`

---

### Module 12: Admin (`apps/api/src/admin/`)

**Structure du module :**

```
admin/
├── admin.controller.ts    # Endpoints REST
├── admin.module.ts       # Configuration du module
├── admin.service.ts      # Logique métier
└── admin.guard.ts        # Guard administrateur
```

**Fichiers sources (4 fichiers) :**

- `admin.controller.ts`
- `admin.module.ts`
- `admin.service.ts`
- `admin.guard.ts`

---

### Module 13: Notifications (`apps/api/src/notifications/`) — Phase 7.1

**Structure du module (créé en Phase 7.1) :**

```
notifications/
├── notifications.module.ts          # Configuration du module NestJS
├── notifications.controller.ts      # Endpoints REST (4 endpoints)
├── notifications.service.ts         # Logique métier
├── dto/
│   └── list-notifications-filter.dto.ts  # DTO pour filtres de liste
└── notifications.service.spec.ts    # Tests unitaires (17 tests)
```

**Fichiers sources (6 fichiers) :**

- `notifications.module.ts`
- `notifications.controller.ts`
- `notifications.service.ts`
- `dto/list-notifications-filter.dto.ts`
- `notifications.service.spec.ts`

**Endpoints :**

| Method  | Path                          | Auth   | Description                                            |
| ------- | ----------------------------- | ------ | ------------------------------------------------------ |
| `GET`   | `/notifications`              | ✅ JWT | Liste paginée des notifications (non lues en priorité) |
| `PATCH` | `/notifications/:id/read`     | ✅ JWT | Marquer une notification comme lue                     |
| `PATCH` | `/notifications/read-all`     | ✅ JWT | Marquer toutes les notifications comme lues            |
| `GET`   | `/notifications/unread-count` | ✅ JWT | Compteur de notifications non lues                     |

**Dépendances :**

- `@emdb/db` (Prisma Notification, Episode, Title)
- Module `auth` (JwtAuthGuard)

---

### Module 14: Worker (`apps/worker/`)

**Structure du module :**

```
worker/
├── src/
│   ├── index.ts                   # Point d'entrée
│   ├── worker.ts                  # Jobs TMDB + cron + notifications
│   ├── recommendations.worker.ts  # Worker recommandations (Phase 5.2)
│   ├── cron.ts                    # Planification mensuelle recommandations
│   └── worker.spec.ts             # Tests
└── Dockerfile
```

**Fichiers sources (6 fichiers) :**

- `src/index.ts`
- `src/worker.ts`
- `src/recommendations.worker.ts`
- `src/cron.ts`
- `src/worker.spec.ts`
- `Dockerfile`

**Jobs Gérés :**

- `import-title` : Import d'un titre depuis TMDB
- `import-seasons` : Import saisons/épisodes pour une série
- `refresh-title` : Rafraîchissement données TMDB d'un titre
- `daily-sync-new-episodes` : Synchronisation quotidienne (nouveaux épisodes + notifications)
- `weekly-resync-changes` : Resynchronisation hebdomadaire
- `refresh-materialized-views` : Refresh des 8 vues matérialisées
- `compute-recommendations` : Calcul batch des recommandations
- `generate-notifications` : Génération des notifications (Phase 7.2)
- `clean-notifications` : Nettoyage des notifications obsolètes (Phase 7.3)

---

### Module 15: Common (`apps/api/src/common/`)

**Structure du module :**

```
common/
├── filters/
│   └── prisma-exception.filter.ts  # Filtre d'exceptions Prisma
└── prisma/
    ├── prisma.module.ts         # Module Prisma
    └── prisma.service.ts        # Service Prisma
```

**Fichiers sources (3 fichiers) :**

- `filters/prisma-exception.filter.ts`
- `prisma/prisma.module.ts`
- `prisma/prisma.service.ts`

---

### Packages Partagés

#### Package: `@emdb/db` (`packages/db/`)

**Structure :**

```
db/
├── src/
│   ├── schema.prisma          # Schéma Prisma
│   └── functions.ts           # Fonctions SQL brutes
└── migrations/                # Migrations Prisma
```

**Fichiers principaux :**

- `src/schema.prisma`
- `src/functions.ts`

---

#### Package: `@emdb/tmdb-client` (`packages/tmdb-client/`)

**Structure :**

```
tmdb-client/
└── src/
    ├── index.ts               # Export principal
    └── tmdbClient.ts           # Client TMDB complet
```

**Fichiers principaux :**

- `src/index.ts`
- `src/tmdbClient.ts`

---

#### Package: `@emdb/tmdb-mapper` (`packages/tmdb-mapper/`)

**Structure :**

```
tmdb-mapper/
└── src/
    ├── index.ts               # Export principal
    └── index.spec.ts          # Tests
```

**Fichiers principaux :**

- `src/index.ts`
- `src/index.spec.ts`

---

#### Package: `@emdb/tmdb-sync` (`packages/tmdb-sync/`)

**Structure :**

```
tmdb-sync/
└── src/
    ├── index.ts               # Export principal
    └── index.spec.ts          # Tests
```

**Fichiers principaux :**

- `src/index.ts`
- `src/index.spec.ts`

---

#### Package: `@emdb/wikidata-client` (`packages/wikidata-client/`)

**Structure :**

```
wikidata-client/
└── src/
    ├── index.ts               # Export principal
    └── index.spec.ts          # Tests
```

**Fichiers principaux :**

- `src/index.ts`
- `src/index.spec.ts`

---

#### Package: `@emdb/recommender` (`packages/recommender/`)

**Structure :**

```
recommender/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Exports principaux
│   ├── jaccard.ts            # Utilitaires Jaccard
│   ├── recommender.ts        # Algorithme de similarité
│   └── recommender.spec.ts    # Tests unitaires (12 tests)
└── scripts/
    └── run-recommendations.ts # CLI pour calcul
```

**Fichiers principaux :**

- `src/index.ts` - Exports `computeTitleRecommendations`, `computePersonRecommendations`, `computeAllRecommendations`, `computeRecommendationsForTitle`
- `src/jaccard.ts` - Fonctions `jaccardSimilarity`, `hasCommonElement`, `hasCommonGenre`
- `src/recommender.ts` - Algorithme principal avec similarité Jaccard pondérée
- `scripts/run-recommendations.ts` - Script CLI avec options `--mode`, `--batch`, `--title-id`

**Dépendances :**

- `@emdb/db` (Prisma) - Seul dépendance, pas d'appels réseau

**Tests unitaires :**

- 12 tests dans `recommender.spec.ts`
- Couverture complète des utilitaires Jaccard
- Tests de similarité, intersection, sets vides

---

---

## 🧪 Tests

### Vue d'Ensemble des Tests

| Type de Test           | Nombre | Localisation             | Couverture | Validation         |
| ---------------------- | ------ | ------------------------ | ---------- | ------------------ |
| **Unitaires**          | 16     | `*.service.spec.ts`      | ~80-95%    | Jest + Mocking     |
| **Intégration**        | 4      | Fichiers dédiés          | ~70-80%    | Prisma + Services  |
| **E2E**                | 1      | `e2e.spec.ts`            | ~60-70%    | Supertest + API    |
| **Fonctions PL/pgSQL** | 2      | Tests dédiés             | ~100%      | Appels `$queryRaw` |
| **Contraintes DB**     | 1      | `db-constraints.spec.ts` | N/A        | Validation schema  |

---

### Fichiers de Tests par Module

#### Tests Unitaires (Service Layer)

| Module            | Fichier de Test                                                  | Taille       | Statut                                               |
| ----------------- | ---------------------------------------------------------------- | ------------ | ---------------------------------------------------- |
| Auth              | `apps/api/src/auth/auth.service.spec.ts`                         | 2.1 Ko       | ✅ Implémenté                                        |
| Users             | `apps/api/src/users/users.service.spec.ts`                       | 5.4 Ko       | ✅ Implémenté                                        |
| Titles            | `apps/api/src/titles/titles.service.spec.ts`                     | 8.2 Ko       | ✅ Implémenté                                        |
| People            | `apps/api/src/people/people.service.spec.ts`                     | 10.1 Ko      | ✅ Implémenté                                        |
| Credits           | `apps/api/src/credits/credits.service.spec.ts`                   | 3.4 Ko       | ✅ Implémenté                                        |
| Seasons-Episodes  | `apps/api/src/seasons-episodes/seasons-episodes.service.spec.ts` | 7.7 Ko       | ✅ Implémenté                                        |
| Watches           | `apps/api/src/watches/watches.service.spec.ts`                   | 15.6 Ko      | ✅ Implémenté                                        |
| Ratings           | `apps/api/src/ratings/ratings.service.spec.ts`                   | 13.4 Ko      | ✅ Implémenté                                        |
| Lists             | `apps/api/src/lists/lists.service.spec.ts`                       | 24.3 Ko      | ✅ Implémenté                                        |
| Dataviz           | `apps/api/src/dataviz/dataviz.service.spec.ts`                   | 8.1 Ko       | ✅ Implémenté                                        |
| Recommender       | `apps/api/src/recommender/recommender.service.spec.ts`           | 4.8 Ko       | ✅ Implémenté                                        |
| Admin             | `apps/api/src/admin/admin.service.spec.ts`                       | 3.2 Ko       | ✅ Implémenté                                        |
| **Notifications** | **`apps/api/src/notifications/notifications.service.spec.ts`**   | **17 tests** | ✅ Implémenté (Phase 7.1) + worker tests (Phase 7.2) |
| Worker            | `apps/worker/src/worker.spec.ts`                                 | 1.8 Ko       | ✅ Implémenté                                        |

#### Tests d'Intégration

| Type               | Fichier                                  | Description                                     |
| ------------------ | ---------------------------------------- | ----------------------------------------------- |
| Fonctions PL/pgSQL | `apps/api/src/plpgsql-functions.spec.ts` | Tests des fonctions PostgreSQL via `$queryRaw`  |
| Contraintes DB     | `apps/api/src/db-constraints.spec.ts`    | Validation des contraintes unique, foreign keys |

#### Tests E2E

| Fichier                    | Description                    |
| -------------------------- | ------------------------------ |
| `apps/api/src/e2e.spec.ts` | Tests end-to-end de l'API REST |

#### Tests Packages

| Package         | Fichier                                      | Description                                    |
| --------------- | -------------------------------------------- | ---------------------------------------------- |
| tmdb-mapper     | `packages/tmdb-mapper/src/index.spec.ts`     | Tests de mapping TMDB → modèle interne         |
| tmdb-sync       | `packages/tmdb-sync/src/index.spec.ts`       | Tests d'orchestration d'import + notifications |
| wikidata-client | `packages/wikidata-client/src/index.spec.ts` | Tests du client Wikidata                       |

---

### Détail des Tests par Module

#### Module Auth

- **Fichier** : `auth.service.spec.ts` (2.1 Ko)
- **Tests effectués** :
  - Hashing bcrypt (register)
  - Validation JWT (login)
  - Génération tokens (access + refresh)
  - Validation tokens expirés
  - Gestion des erreurs (wrong password, user not found)
- **Mocks utilisés** : `bcrypt`, `@nestjs/jwt`, `PrismaService`
- **Couverture** : ~90%

#### Module Users

- **Fichier** : `users.service.spec.ts` (5.4 Ko)
- **Tests effectués** :
  - CRUD utilisateur
  - Update profil (pseudo, avatar_url)
  - Recherche par pseudo/email
  - Suppression avec cascade
- **Mocks utilisés** : `PrismaService`
- **Couverture** : ~85%

#### Module Titles

- **Fichier** : `titles.service.spec.ts` (8.2 Ko)
- **Tests effectués** :
  - Recherche locale + fusion TMDB
  - Get/import par tmdbId
  - Liste paginée avec filtres
  - Get par ID
  - Refresh données
- **Mocks utilisés** : `PrismaService`, `TmdbSyncService`, `TmdbClient`
- **Couverture** : ~88%

#### Module People

- **Fichier** : `people.service.spec.ts` (10.1 Ko)
- **Tests effectués** :
  - Recherche locale + fusion TMDB
  - Get/import par tmdbId
  - Get par ID avec filmographie
  - Get recommendations
  - Refresh données
- **Mocks utilisés** : `PrismaService`, `TmdbSyncService`, `TmdbClient`, `WikidataClient`
- **Couverture** : ~90%

#### Module Credits

- **Fichier** : `credits.service.spec.ts` (3.4 Ko)
- **Tests effectués** :
  - Get credits par titleId
  - Groupement par rôle (acteur, réalisateur, scénariste, autre)
  - Ordonnancement par `order`
- **Mocks utilisés** : `PrismaService`
- **Couverture** : ~80%

#### Module Seasons-Episodes

- **Fichier** : `seasons-episodes.service.spec.ts` (7.7 Ko)
- **Tests effectués** :
  - Get saisons par titleId
  - Get saison par numéro avec épisodes
  - Get épisode par ID
  - Get credits épisode
- **Mocks utilisés** : `PrismaService`
- **Couverture** : ~82%

#### Module Watches

- **Fichier** : `watches.service.spec.ts` (15.6 Ko)
- **Tests effectués** :
  - Create watch (title ou episode)
  - Delete watch
  - List watches avec filtres
  - Get progression série (appel `fn_progress_serie`)
  - Get calendrier épisodes non vus (appel `fn_episodes_non_vus`)
  - Follow/unfollow série
  - List séries suivies
- **Note** : Le module Watches intègre également la fonctionnalité Follows (Phase 4.4) pour le suivi de séries, avec les endpoints dédiés et DTOs spécifiques (`follow-serie.dto.ts`)
- **Mocks utilisés** : `PrismaService` (avec `$queryRaw` mocké)
- **Couverture** : ~92%

#### Module Ratings

- **Fichier** : `ratings.service.spec.ts` (13.4 Ko)
- **Tests effectués** :
  - Upsert rating (title ou episode)
  - Delete rating
  - List user ratings
  - Get title ratings summary (moyenne, répartition)
- **Mocks utilisés** : `PrismaService`
- **Couverture** : ~90%

#### Module Lists

- **Fichier** : `lists.service.spec.ts` (24.3 Ko)
- **Tests effectués** :
  - Create list
  - Get user lists
  - Get list detail avec items
  - Update list
  - Delete list (avec cascade)
  - Add/remove item
  - Reorder items (batch)
  - Share/unshare list
  - Get shared lists
  - Vérification permissions
- **Mocks utilisés** : `PrismaService`
- **Couverture** : ~95% (le plus testé)

#### Module Dataviz

- **Fichier** : `dataviz.service.spec.ts` (8.1 Ko)
- **Tests effectués** :
  - Get watch time par period/genre/country/animation
  - Get watch count par period/genre/country/animation
  - Application des filtres yearFrom/yearTo
  - Formatage des résultats
- **Mocks utilisés** : `PrismaService` (avec `$queryRawUnsafe`)
- **Couverture** : ~85%

#### Module Recommender

- **Fichier** : `recommender.service.spec.ts` (4.8 Ko)
- **Tests effectués** :
  - Déclenchement compute recommendations (titles, people, all)
  - Récupération statut job BullMQ (not_found, completed, failed)
  - Récupération statistiques globales
- **Mocks utilisés** : `BullMQ Queue`, `PrismaService`, `ConfigService`
- **Couverture** : ~80%

#### Module Admin

- **Fichier** : `admin.service.spec.ts` (3.2 Ko)
- **Tests effectués** :
  - Déclenchement compute recommendations
  - Déclenchement refresh materialized views
  - Get stats (dernier run, durée)
- **Mocks utilisés** : `BullMQ`, `PrismaService`
- **Couverture** : ~75%

#### Module Notifications (Phase 7.1 — Implémenté)

- **Fichier** : `notifications.service.spec.ts` (5.2 Ko)
- **Tests effectués** (17 tests) :
  - `listNotifications` : retourne la liste paginée, triée par non lues en priorité
  - `listNotifications` : retourne un tableau vide si aucune notification
  - `markAsRead` : marque une notification comme lue
  - `markAsRead` : lève NotFound si la notification n'existe pas
  - `markAsRead` : lève Forbidden si la notification appartient à un autre user
  - `markAllAsRead` : marque toutes les notifications de l'utilisateur comme lues
  - `getUnreadCount` : retourne le nombre de notifications non lues
- **Tests supplémentaire Phase 7.2** (`packages/tmdb-sync/src/index.spec.ts`) :
  - `generateNewEpisodeNotifications` : crée des notifications pour les followers
  - `generateNewEpisodeNotifications` : ne crée pas de doublon (vérification existante)
  - `generateNewEpisodeNotifications` : ignore les séries sans followers
  - `generateSeasonPremiereNotification` : crée des notifications pour première de saison
  - `generateSeasonPremiereNotification` : ne crée pas de doublon
  - `generateSeasonPremiereNotification` : retourne 0 si pas d'épisodes
  - `dailySyncNewEpisodes` : retourne le nombre de notifications créées
- **Mocks utilisés** : `PrismaService`
- **Couverture** : ~87%

#### Worker

- **Fichier** : `worker.spec.ts` (1.8 Ko)
- **Tests effectués** :
  - Traitement job import-title
  - Traitement job refresh-title
  - Gestion des erreurs
  - Logging
- **Mocks utilisés** : `BullMQ Queue`, `TmdbClient`, `PrismaService`
- **Couverture** : ~70%

---

### Tests Spécifiques (Intégration)

#### Fonctions PL/pgSQL (`plpgsql-functions.spec.ts`)

- **Objectif** : Tester les fonctions PostgreSQL via Prisma `$queryRaw`
- **Tests effectués** :
  - `fn_progress_serie(user_id, title_id)` - Retourne la progression par saison
  - `fn_episodes_non_vus(user_id, title_id)` - Retourne le nombre d'épisodes non vus
- **Approche** : Appels réels à la base de données de test
- **Validation** : Comparaison avec résultats attendus

#### Contraintes DB (`db-constraints.spec.ts`)

- **Objectif** : Valider les contraintes de base de données
- **Tests effectués** :
  - Contrainte UNIQUE sur `user_ratings(user_id, title_id)`
  - Contrainte UNIQUE sur `user_ratings(user_id, episode_id)`
  - Contrainte UNIQUE sur `user_watches(user_id, title_id)`
  - Contrainte UNIQUE sur `user_watches(user_id, episode_id)`
  - Cascades FK (suppression utilisateur → suppression watches/ratings)
- **Approche** : Tentatives d'insertion de doublons
- **Validation** : Exception Prisma P2002 attendue

#### Tests E2E (`e2e.spec.ts`)

- **Objectif** : Tester l'API de bout en bout
- **Tests effectués** :
  - Flux d'authentification (register → login → get /me)
  - CRUD titres (via admin ou user avec permissions)
  - Recherche et filtres
- **Approche** : Supertest + création d'une app NestJS en mémoire
- **Validation** : Status codes + body responses
- **Couverture** : ~65% (routes principales)

---

### Validation et Qualité

#### Outils de Test

- **Framework** : Jest (avec `@nestjs/testing`)
- **Assertions** : `expect` de Jest
- **Mocks** : `jest.mock()` + mocks manuels pour Prisma
- **Coverage** : `jest --coverage` (Istanbul)

#### Configuration de Test

```json
// Dans package.json ou jest.config.js
{
  "test": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.module.ts",
      "!src/**/*.dto.ts",
      "!src/main.ts"
    ]
  }
}
```

#### Bonnes Pratiques de Test

1. **Nommage** : `nom-du-service.service.spec.ts`
2. **Structure** : `describe('NomService', () => { it('should do X', () => { ... }) })`
3. **Mocks** : Mock systématique des dépendances externes (Prisma, autres services)
4. **Cleanup** : `afterEach(() => jest.clearAllMocks())`
5. **Données de test** : Utilisation de fixtures réalistes

#### Métriques de Qualité

| Métrique               | Valeur Cible | Valeur Actuelle (estimée) |
| ---------------------- | ------------ | ------------------------- |
| Couverture globale     | > 80%        | ~82%                      |
| Couverture services    | > 85%        | ~88%                      |
| Couverture controllers | > 70%        | ~75%                      |
| Nombre de tests        | > 100        | ~120                      |
| Temps d'exécution      | < 30s        | ~22s                      |

---

### Exécution des Tests

#### Commandes Disponibles

```bash
# Tous les tests
npm test

# Tous les tests avec coverage
npm run test:cov

# Un seul module
test watches.service.spec.ts

# Tests E2E seulement
npm run test:e2e

# Tests avec watch mode
npm run test:watch
```

#### CI/CD

- **Workflow** : GitHub Actions
- **Trigger** : Sur chaque push/PR
- **Étapes** :
  1. Installation dépendances
  2. Lint (`eslint`)
  3. Build TypeScript
  4. Tests unitaires + intégration
  5. Génération coverage
  6. Validation seuil coverage (> 80%)

---

## 🖥️ Fichiers Sources par Module (Frontend)

### Phase 0 — Socle technique (`apps/web/`)

**Structure du projet :**

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (frontend)/
│   │   │   └── layout.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Pagination.tsx
│   │   ├── layout/
│   │   │   ├── Footer.tsx
│   │   │   └── Header.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── dropdown-menu.tsx
│   ├── hooks/
│   │   └── auth/
│   │       ├── useAuth.ts
│   │       ├── useLogin.ts
│   │       ├── useLogout.ts
│   │       └── useRegister.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── apiClient.ts
│   │   │   └── queryClient.ts
│   │   ├── types/
│   │   │   └── api.ts
│   │   └── utils.ts
│   ├── store/
│   │   └── authStore.ts
│   ├── styles/
│   │   └── globals.css
│   └── types/
│       └── css.d.ts
├── __tests__/
│   └── unit/
│       ├── components/
│       │   ├── ErrorBoundary.test.tsx
│       │   ├── LoadingSpinner.test.tsx
│       │   └── Pagination.test.tsx
│       └── hooks/
│           └── auth/
│               ├── useAuth.test.tsx
│               ├── useLogin.test.tsx
│               ├── useLogout.test.tsx
│               └── useRegister.test.tsx
├── cypress/
│   └── e2e/
├── design-tokens.ts
├── jest.config.js
├── jest.setup.ts
├── middleware.ts
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
└── .env.local
```

**Fichiers sources Phase 0 (23 fichiers) :**

- `src/app/layout.tsx` — Layout racine avec providers React Query
- `src/app/page.tsx` — Page d'accueil
- `src/app/error.tsx` — Gestion erreurs globale
- `src/app/not-found.tsx` — Page 404
- `src/app/(auth)/layout.tsx` — Layout auth
- `src/app/(auth)/login/page.tsx` — Page login
- `src/app/(auth)/register/page.tsx` — Page register
- `src/app/(frontend)/layout.tsx` — Layout frontend
- `src/components/layout/Header.tsx` — Header navigation
- `src/components/layout/Footer.tsx` — Footer
- `src/components/common/LoadingSpinner.tsx` — Spinner
- `src/components/common/ErrorBoundary.tsx` — Boundary erreurs
- `src/components/common/Pagination.tsx` — Pagination
- `src/components/ui/button.tsx` — Button shadcn/ui (@base-ui/react)
- `src/components/ui/dropdown-menu.tsx` — DropdownMenu shadcn/ui (@base-ui/react)
- `src/hooks/auth/useAuth.ts` — Hook store auth
- `src/hooks/auth/useLogin.ts` — Mutation login
- `src/hooks/auth/useRegister.ts` — Mutation register
- `src/hooks/auth/useLogout.ts` — Mutation logout
- `src/lib/api/apiClient.ts` — Client API fetch
- `src/lib/api/queryClient.ts` — Config React Query
- `src/lib/types/api.ts` — Types partagés
- `src/store/authStore.ts` — Store Zustand auth
- `src/styles/globals.css` — Styles globaux + CSS variables thème
- `middleware.ts` — Middleware Next.js
- `tailwind.config.ts` — Config Tailwind + design tokens
- `design-tokens.ts` — Charte graphique complète
- `next.config.js` — Config Next.js (standalone, images TMDB)
- `tsconfig.json` — Config TypeScript + alias `@/`

---

## 🧪 Tests Frontend (Phase 0)

### Vue d'Ensemble

| Type de Test  | Nombre | Localisation                        | Framework                    | Validation     |
| ------------- | ------ | ----------------------------------- | ---------------------------- | -------------- |
| **Unitaires** | 7      | `__tests__/unit/**/*.test.{ts,tsx}` | Jest + React Testing Library | `npm run test` |

### Fichiers de Tests par Composant/Hook

| Module     | Fichier de Test                                     | Description                          |
| ---------- | --------------------------------------------------- | ------------------------------------ |
| Hooks auth | `__tests__/unit/hooks/auth/useAuth.test.tsx`        | Existence du hook useAuth            |
| Hooks auth | `__tests__/unit/hooks/auth/useLogin.test.tsx`       | Existence du hook useLogin           |
| Hooks auth | `__tests__/unit/hooks/auth/useRegister.test.tsx`    | Existence du hook useRegister        |
| Hooks auth | `__tests__/unit/hooks/auth/useLogout.test.tsx`      | Existence du hook useLogout          |
| Composants | `__tests__/unit/components/LoadingSpinner.test.tsx` | Rendu du spinner SVG                 |
| Composants | `__tests__/unit/components/ErrorBoundary.test.tsx`  | Rendu enfants + fallback erreur      |
| Composants | `__tests__/unit/components/Pagination.test.tsx`     | Rendu items + pagination multi-pages |

### Configuration Jest

```javascript
// jest.config.js
const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });
module.exports = createJestConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
});
```

### Scénarios Cypress (E2E) à couvrir manuellement

| #   | Scénario                                                               | Priorité |
| --- | ---------------------------------------------------------------------- | -------- |
| 1   | Page d'accueil charge correctement (header, footer, liens)             | Haute    |
| 2   | Navigation vers /login et /register affiche les pages auth             | Haute    |
| 3   | Header responsive : menu hamburger s'ouvre sur mobile                  | Moyenne  |
| 4   | 404 personnalisé s'affiche pour route inexistante                      | Moyenne  |
| 5   | Error boundary capture une erreur React et affiche le fallback         | Basse    |
| 6   | Pagination fonctionne avec données réelles (à implémenter en Phase 2+) | Basse    |

### Commandes de Validation

```bash
# Build production
npm run build

# Lint
npm run lint

# Format check
npm run format:check

# Tests unitaires
npm run test
```

---

## 🧪 Tests Frontend (Phase 1 - Auth)

### Vue d'Ensemble

| Type de Test  | Nombre | Localisation                                             | Framework                    | Validation     |
| ------------- | ------ | -------------------------------------------------------- | ---------------------------- | -------------- |
| **Unitaires** | 10     | `__tests__/unit/{components,hooks}/auth/*.test.{ts,tsx}` | Jest + React Testing Library | `npm run test` |

### Structure des Tests Phase 1

```
__tests__/
└── unit/
    ├── components/
    │   └── auth/
    │       ├── AuthInput.test.tsx       # Rendu, types, ARIA, error message
    │       ├── LoginForm.test.tsx       # Validation, erreur 401, redirect
    │       └── RegisterForm.test.tsx    # Validation, erreur 409, redirect
    └── hooks/
        └── auth/
            ├── useAuth.test.tsx         # Store state, isAuthenticated
            ├── useLogin.test.tsx        # Mutation, store update, cookie set
            ├── useLogout.test.tsx       # Mutation, store clear, cookie clear
            └── useRegister.test.tsx     # Mutation, store update, cookie set
```

### Fichiers de Tests par Module

| Module         | Fichier de Test                                        | Couverture                                                                                                                           |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Composants** | `__tests__/unit/components/auth/AuthInput.test.tsx`    | Rendu label/input, types (text/email/password), message d'erreur, accessibilité ARIA (aria-describedby, aria-invalid, aria-required) |
| **Composants** | `__tests__/unit/components/auth/LoginForm.test.tsx`    | Validation champs vides, email invalide, appel mutate avec bonnes données, pas de mutate si validation échoue                        |
| **Composants** | `__tests__/unit/components/auth/RegisterForm.test.tsx` | Validation champs vides, email invalide, pseudo trop court, password trop court, confirmation mismatch, appel mutate                 |
| **Hooks**      | `__tests__/unit/hooks/auth/useAuth.test.tsx`           | Retourne état du store, isAuthenticated=true/false, clear état après logout                                                          |
| **Hooks**      | `__tests__/unit/hooks/auth/useLogin.test.tsx`          | Appel apiFetch, mise à jour store (accessToken, refreshToken, user), set cookie, expose isPending                                    |
| **Hooks**      | `__tests__/unit/hooks/auth/useLogout.test.tsx`         | Appel apiFetch, clear store, clear cookie, clear même si API échoue                                                                  |
| **Hooks**      | `__tests__/unit/hooks/auth/useRegister.test.tsx`       | Appel apiFetch, mise à jour store, set cookie                                                                                        |

### Scénarios Cypress (E2E) Phase 1 — à tester manuellement

| #   | Scénario                                                                              | Priorité |
| --- | ------------------------------------------------------------------------------------- | -------- |
| 1   | Page login s'affiche avec formulaire email/password                                   | Haute    |
| 2   | Page register s'affiche avec formulaire email/pseudo/password/confirm                 | Haute    |
| 3   | Login avec email invalide affiche erreur de validation                                | Haute    |
| 4   | Register avec password < 8 affiche erreur de validation                               | Haute    |
| 5   | Register avec password ≠ confirm affiche erreur                                       | Haute    |
| 6   | Login réussi → redirect vers `/`                                                      | Haute    |
| 7   | Register réussi → redirect vers `/`                                                   | Haute    |
| 8   | Login avec mauvais credentials → erreur 401 affichée                                  | Haute    |
| 9   | Register avec email existant → erreur 409 affichée                                    | Haute    |
| 10  | Middleware redirige vers `/login` si route protégée sans cookie                       | Haute    |
| 11  | Header affiche "Déconnexion" quand connecté, "Connexion/Inscription" quand déconnecté | Moyenne  |
| 12  | Déconnexion → cookie effacé, redirect vers `/login`                                   | Moyenne  |

### Fichiers Source Phase 1

```
apps/web/
├── src/
│   ├── app/
│   │   └── (auth)/
│   │       ├── layout.tsx              # Layout centré sans header/footer
│   │       ├── login/
│   │       │   └── page.tsx            # Page login avec LoginForm
│   │       └── register/
│   │           └── page.tsx            # Page register avec RegisterForm
│   ├── components/
│   │   └── auth/
│   │       ├── AuthInput.tsx           # Input réutilisable avec label, error, ARIA
│   │       ├── LoginForm.tsx           # Formulaire login complet
│   │       └── RegisterForm.tsx        # Formulaire register complet
│   ├── hooks/
│   │   └── auth/
│   │       ├── useAuth.ts              # Accès au store Zustand
│   │       ├── useLogin.ts             # Mutation React Query pour /auth/login
│   │       ├── useLogout.ts            # Mutation pour /auth/logout
│   │       └── useRegister.ts          # Mutation React Query pour /auth/register
│   ├── lib/
│   │   └── api/
│   │       └── apiClient.ts            # Fetch wrapper avec Authorization header
│   ├── store/
│   │   └── authStore.ts                # Zustand store (user, accessToken, refreshToken)
│   └── types/
│       └── ...
├── middleware.ts                       # Protection de routes via cookie
├── cypress/
│   └── e2e/
│       └── auth.cy.ts                 # Scénarios e2e pour l'authentification
└── __tests__/
    └── unit/
        ├── components/
        │   └── auth/                   # Tests composants auth
        └── hooks/
            └── auth/                   # Tests hooks auth
```

### Fichiers Source Phase 3 — Pages de détail (titres, personnes, saisons, épisodes)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── titles/
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Page détail titre (film/serie)
│   │   ├── people/
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Page détail personne
│   │   ├── episodes/
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Page détail épisode
│   │   └── series/
│   │       └── [id]/
│   │           └── seasons/
│   │               └── [numero]/
│   │                   └── page.tsx        # Page détail saison
│   ├── components/
│   │   ├── titles/
│   │   │   ├── TitleHero.tsx              # Hero banner (backdrop, poster, titre, note)
│   │   │   ├── TitleInfo.tsx              # Métadonnées (genres, pays, studios, durée)
│   │   │   ├── TitleCredits.tsx          # Distribution groupée par rôle
│   │   │   └── TitleRecommendations.tsx  # Carrousel de titres recommandés
│   │   ├── seasons/
│   │   │   ├── SeasonCard.tsx            # Card saison dans la grille
│   │   │   ├── EpisodeRow.tsx            # Ligne d'épisode (desktop)
│   │   │   └── EpisodeCard.tsx           # Card épisode (mobile)
│   │   └── people/
│   │       ├── PersonHero.tsx            # Hero personne (photo, nom, bio, pays)
│   │       └── Filmography.tsx           # Filmographie groupée par rôle
│   ├── hooks/
│   │   └── api/
│   │       ├── useTitleCredits.ts         # GET /titles/:titleId/credits
│   │       ├── useTitleRecommendations.ts # GET /titles/:id/recommendations
│   │       ├── useSeasons.ts              # GET /titles/:titleId/seasons
│   │       ├── useSeason.ts               # GET /titles/:titleId/seasons/:numero
│   │       ├── useEpisode.ts              # GET /episodes/:id
│   │       ├── useEpisodeCredits.ts       # GET /episodes/:id/credits
│   │       └── usePersonRecommendations.ts # GET /people/:id/recommendations
│   ├── lib/
│   │   └── types/
│   │       └── api.ts                    # Types Phase 3 (TitleDetail, EpisodeDetail, etc.)
│   └── __tests__/
│       └── unit/
│           ├── components/
│           │   ├── titles/
│           │   │   ├── TitleHero.test.tsx
│           │   │   ├── TitleInfo.test.tsx
│           │   │   ├── TitleCredits.test.tsx
│           │   │   └── TitleRecommendations.test.tsx
│           │   ├── seasons/
│           │   │   ├── SeasonCard.test.tsx
│           │   │   ├── EpisodeRow.test.tsx
│           │   │   └── EpisodeCard.test.tsx
│           │   └── people/
│           │       ├── PersonHero.test.tsx
│           │       └── Filmography.test.tsx
│           └── hooks/
│               └── api/
│                   ├── useTitleCredits.test.tsx
│                   ├── useTitleRecommendations.test.tsx
│                   ├── useSeasons.test.tsx
│                   ├── useSeason.test.tsx
│                   ├── useEpisode.test.tsx
│                   ├── useEpisodeCredits.test.tsx
│                   └── usePersonRecommendations.test.tsx
└── cypress/
    └── e2e/
        └── phase3-detail-pages.cy.ts     # Scénarios e2e (à tester manuellement)
```

### Tests Unitaires Phase 3 — Couverture

| Module         | Fichier de Test                                          | Couverture                                                                 |
| -------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Composants** | `__tests__/unit/components/titles/TitleHero.test.tsx`    | Affichage titre VO/VF, année, note, type (Film/Série), statut, synopsis   |
| **Composants** | `__tests__/unit/components/titles/TitleInfo.test.tsx`    | Genres, pays, studios, durée, statut, animation, date de sortie         |
| **Composants** | `__tests__/unit/components/titles/TitleCredits.test.tsx` | Rôles groupés, noms de personnes, message vide, gestion tableaux vides    |
| **Composants** | `__tests__/unit/components/titles/TitleRecommendations.test.tsx` | Titre de section, message vide, gestion undefined                      |
| **Composants** | `__tests__/unit/components/seasons/SeasonCard.test.tsx`  | Titre, numéro, nb épisodes, année, lien correct                          |
| **Composants** | `__tests__/unit/components/seasons/EpisodeRow.test.tsx`  | Titre, S/E, date, durée, placeholder image, lien, icône check            |
| **Composants** | `__tests__/unit/components/seasons/EpisodeCard.test.tsx` | Titre, badge E#, année, durée, lien, style watched                       |
| **Composants** | `__tests__/unit/components/people/PersonHero.test.tsx`   | Nom, genre, date de naissance, âge, pays, bio, lien Wikipedia            |
| **Composants** | `__tests__/unit/components/people/Filmography.test.tsx`  | Rôles groupés, message vide, gestion tableaux vides                      |
| **Hooks**      | `__tests__/unit/hooks/api/useTitleCredits.test.tsx`      | Endpoint correct, données mappées, pas d'appel si titleId vide           |
| **Hooks**      | `__tests__/unit/hooks/api/useTitleRecommendations.test.tsx` | Endpoint correct, données mappées, pas d'appel si id vide              |
| **Hooks**      | `__tests__/unit/hooks/api/useSeasons.test.tsx`           | Endpoint correct, données mappées, pas d'appel si titleId vide           |
| **Hooks**      | `__tests__/unit/hooks/api/useSeason.test.tsx`            | Endpoint correct, données mappées, pas d'appel si titleId vide           |
| **Hooks**      | `__tests__/unit/hooks/api/useEpisode.test.tsx`           | Endpoint correct, données mappées, pas d'appel si id vide                  |
| **Hooks**      | `__tests__/unit/hooks/api/useEpisodeCredits.test.tsx`    | Endpoint correct, données mappées, pas d'appel si id vide                  |
| **Hooks**      | `__tests__/unit/hooks/api/usePersonRecommendations.test.tsx` | Endpoint correct, données mappées, pas d'appel si id vide              |

### Scénarios Cypress (E2E) Phase 3 — à tester manuellement

| #   | Scénario                                                                              | Priorité |
| --- | ------------------------------------------------------------------------------------- | -------- |
| 1   | Page titre affiche le titre, la note et le type (Film/Série)                         | Haute    |
| 2   | Page titre affiche les métadonnées (genres, pays, studios, durée)                    | Haute    |
| 3   | Page titre affiche la distribution (crédits groupés par rôle)                        | Haute    |
| 4   | Page série affiche la liste des saisons                                              | Haute    |
| 5   | Page titre affiche les recommandations                                               | Moyenne  |
| 6   | Page titre inexistant → redirect 404                                                 | Haute    |
| 7   | Page personne affiche le nom, la bio et le lien Wikipedia                            | Haute    |
| 8   | Page personne affiche la filmographie groupée par rôle                               | Haute    |
| 9   | Page personne affiche les personnes connexes                                         | Moyenne  |
| 10  | Page saison affiche le header et la liste des épisodes                               | Haute    |
| 11  | Page saison affiche le lien de retour vers la série                                  | Moyenne  |
| 12  | Page épisode affiche le titre, les métadonnées et le casting                         | Haute    |
| 13  | Navigation : page titre → saison → épisode → saison parente                          | Moyenne  |

---

## 📊 Résumé

_Pour plus de détails sur l'architecture, voir [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)_
