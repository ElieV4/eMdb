# Suivi des bugs — EMDB

## Bugs corrigés

### 1. Backend ne démarre pas / import TMDB en 500
- **Symptôme :** `DATABASE_URL` manquant au démarrage de NestJS, puis `PrismaClientInitializationError`.
- **Cause racine :** `apps/api/src/main.ts` ne chargeait pas le `.env` racine du monorepo. `process.cwd()` pointait vers `apps/api`, donc le chemin `.env` était incorrect.
- **Correction :** Chargement explicite de `emdb/.env` via `dotenv.config({ path: path.resolve(process.cwd(), '..', '..', '.env') })` dans `apps/api/src/main.ts`.
- **Fichiers modifiés :** `apps/api/src/main.ts`
- **Tests unitaires à créer :**
  - Vérifier que `process.env.DATABASE_URL` est défini après le bootstrap de l’API.
  - Vérifier que `PrismaClient` peut se connecter à la base en environnement de test.

### 2. Authentification PostgreSQL échouée pour `emdb:emdb`
- **Symptôme :** `Authentication failed against database server at localhost, the provided database credentials for (not available) are not valid`.
- **Cause racine :** La base `emdb` et le rôle `emdb` n’existaient pas dans PostgreSQL 18 local.
- **Correction :** Création du rôle et de la base :
  ```sql
  CREATE ROLE emdb WITH LOGIN PASSWORD 'emdb';
  CREATE DATABASE emdb OWNER emdb;
  ```
- **Tests unitaires à créer :**
  - Test d’intégration : vérifier que la chaîne complète `DATABASE_URL` → connexion Prisma → base `emdb` fonctionne.
  - Test de migration : vérifier que `prisma db push` applique bien le schéma sur une base vide.

### 3. Tables Prisma absentes dans la base `emdb`
- **Symptôme :** `The table (not available) does not exist in the current database` (`P2021`).
- **Cause racine :** Aucune migration ni synchronisation de schéma n’avait été exécutée sur la base `emdb`.
- **Correction :** `prisma db push --accept-data-loss` depuis `packages/db` avec le `.env` racine chargé.
- **Tests unitaires à créer :**
  - Vérifier que toutes les tables déclarées dans `schema.prisma` existent après `db push`.
  - Vérifier qu’une requête CRUD simple sur `titles` fonctionne en test d’intégration.

### 4. Page film/série : `note_imdb.toFixed is not a function` dans `TitleHero.tsx`
- **Symptôme :** Affichage de « Une erreur est survenue » sur la page de détail d’un titre.
- **Cause racine :** `note_imdb` est stocké en base sous forme de chaîne (ex: `"8.4"`), mais `TitleHero.tsx` appelait `.toFixed()` qui est une méthode de `number`.
- **Correction :** Converti la valeur en nombre avant appel : `Number(note_imdb).toFixed(1)` dans `apps/web/src/components/titles/TitleHero.tsx`.
- **Fichiers modifiés :** `apps/web/src/components/titles/TitleHero.tsx`
- **Tests unitaires à créer :**
  - Vérifier que le formatage de `note_imdb` gère les valeurs `string` et `number`.
  - Vérifier que la page de détail n’affiche pas d’erreur quand `note_imdb` est `null` ou une chaîne.

### 5. Page film/série : `Wikidata request failed 429`
- **Symptôme :** Import ou détail d’un titre échoue avec `Wikidata request failed 429`.
- **Cause racine :** Rate limit dépassé sur l’API Wikidata lors de l’import TMDB (`importPersonByTmdbId`). `getWikipediaUrlFromWikidataId` throwait sur `429` au lieu de considérer Wikipédia comme optionnelle.
- **Correction :** Gestion du `429` dans `packages/wikidata-client/src/index.ts` : retour de `null` en cas de rate limit, sans lever d’erreur. Le champ `wiki_url` reste nullable et n’empêche plus l’import.
- **Fichiers modifiés :** `packages/wikidata-client/src/index.ts`
- **Tests unitaires à créer :**
  - Vérifier le comportement quand Wikidata retourne `429 Too Many Requests`.
  - Vérifier que l’import d’un titre/personne continue sans `wiki_url` en cas de `429`.

### 6. Next.js : `ReferenceError: Badge is not defined`
- **Symptôme :** Erreur runtime dans `src/app/profile/page.tsx` ligne 198.
- **Cause racine :** Le composant `Badge` est utilisé mais non importé.
- **Correction :** Ajout de l’import `import { Badge } from "@/components/ui/badge"` dans `apps/web/src/app/profile/page.tsx`.
- **Fichiers modifiés :** `apps/web/src/app/profile/page.tsx`
- **Tests unitaires à créer :**
  - Vérifier que la page profile compile sans erreur.
  - Vérifier que `Badge` est bien importé et utilisé.

### 7. Import TMDB : `PrismaClientKnownRequestError` sur `genres.upsert()`
- **Symptôme :** `Unique constraint failed on the fields: (nom)` lors de l’import d’un titre.
- **Cause racine :** `ensureGenreIds` faisait un `upsert` sur `tmdb_id`, mais la contrainte unique sur `nom` rentrait en conflit quand le genre existait déjà sous un autre `tmdb_id`.
- **Correction :** L’upsert cherche désormais sur `nom`, met à jour `tmdb_id` si fourni, et ignore les genres sans nom.
- **Fichiers modifiés :** `packages/tmdb-sync/src/index.ts`
- **Tests unitaires à créer :**
  - Vérifier que l’import d’un titre ne crash pas quand un genre existe déjà en base.
  - Vérifier que `tmdb_id` est bien mis à jour lors d’un re-import.

### 8. Page titre/série/card : `note.toFixed is not a function` dans `TitleCard.tsx` et `RatingBadge.tsx`
- **Symptôme :** Affichage de « Une erreur est survenue » sur la page de détail d’un titre ou lors de l’affichage d’une carte titre/rating.
- **Cause racine :** `note` est stocké en base sous forme de chaîne (ex: `"8.4"`), mais `TitleCard.tsx` et `RatingBadge.tsx` appelaient `.toFixed()` qui est une méthode de `number`.
- **Correction :** Converti la valeur en nombre avant appel : `Number(note).toFixed(1)` dans `apps/web/src/components/titles/TitleCard.tsx` et `apps/web/src/components/ratings/RatingBadge.tsx`.
- **Fichiers modifiés :** `apps/web/src/components/titles/TitleCard.tsx`, `apps/web/src/components/ratings/RatingBadge.tsx`
- **Tests unitaires à créer :**
  - Vérifier que `TitleCard` gère les valeurs `string` et `number` pour `note`.
  - Vérifier que `RatingBadge` gère les valeurs `string` et `number` pour `note`.

### 9. Bouton « Voir le calendrier complet » redirige vers la page profil
- **Symptôme :** Le bouton du calendrier sur la home envoie vers `/profile` au lieu de `/calendar`.
- **Cause racine :** Le `DashboardSection` de `apps/web/src/app/page.tsx` utilisait `actionHref="/profile"` pour le calendrier.
- **Correction :** Remplacé par `actionHref="/calendar"`.
- **Fichiers modifiés :** `apps/web/src/app/page.tsx`
- **Tests unitaires :**
  - `apps/web/src/__tests__/unit/pages/HomePage.test.tsx` — vérifie que le lien « Voir le calendrier complet » a pour `href` `/calendar`.

## Bugs restants identifiés

### 10. Page `/calendar` manquante
- **Symptôme :** Aucune page calendrier n’existe pour afficher les épisodes non vus des séries suivies.
- **Cause racine :** Le fichier `apps/web/src/app/calendar/page.tsx` n’a jamais été créé.
- **Fichier concerné :** `apps/web/src/app/calendar/page.tsx`
- **Tests unitaires à créer :**
  - Vérifier que la page `/calendar` existe et affiche les épisodes non vus.
  - Vérifier que l’endpoint `/calendar` du backend est bien consommé.

### 11. Page `/lists` manquante
- **Symptôme :** La route `/lists` renvoie une erreur 404 ou une page vide. Aucune page de gestion des listes n’existe.
- **Cause racine :** Le répertoire `apps/web/src/app/lists/` existe mais ne contient pas de `page.tsx`.
- **Fichier concerné :** `apps/web/src/app/lists/page.tsx`
- **Tests unitaires à créer :**
  - Vérifier que la page `/lists` existe et affiche les listes de l’utilisateur.
  - Vérifier que la création/modification/suppression de liste fonctionne.

### 12. Module saisons & épisodes : données non chargées sur la page série
- **Symptôme :** La page détail d’une série n’affiche pas les saisons et épisodes.
- **Cause racine :** Le hook `useSeasons` ou le composant d’affichage des saisons n’est pas correctement appelé ou les données ne sont pas récupérées depuis `GET /titles/:titleId/seasons`.
- **Fichier concerné :** `apps/web/src/app/series/[id]/page.tsx`, `apps/web/src/hooks/api/useSeasons.ts`
- **Tests unitaires à créer :**
  - Vérifier que `useSeasons` récupère bien les saisons d’une série.
  - Vérifier que la page série affiche la liste des saisons et épisodes.

### 13. Page titre/série : fonctionnalités utilisateur manquantes (watch, liste, follow, note)
- **Symptôme :** Sur la page de détail d’un titre, les boutons « Marquer comme vu », « Ajouter à une liste », « Suivre » et « Noter » sont absents ou non fonctionnels.
- **Cause racine :** Les composants `WatchButton`, `FollowButton`, `RatingInput` et les hooks associés ne sont pas intégrés à la page de détail titre/série.
- **Fichier concerné :** `apps/web/src/app/titles/[id]/page.tsx`, `apps/web/src/app/series/[id]/page.tsx`
- **Tests unitaires à créer :**
  - Vérifier que le bouton « Marquer comme vu » est présent et fonctionnel.
  - Vérifier que le bouton « Suivre » est présent pour les séries.
  - Vérifier que le composant de notation est présent et fonctionnel.

### 14. Page personne : module filmographie ne charge pas
- **Symptôme :** La page détail d’une personne n’affiche pas sa filmographie.
- **Cause racine :** Le hook `usePersonFilmography` ou le composant `Filmography` n’est pas correctement appelé ou les données ne sont pas récupérées depuis `GET /people/:id/filmography`.
- **Fichier concerné :** `apps/web/src/app/people/[id]/page.tsx`, `apps/web/src/components/people/Filmography.tsx`
- **Tests unitaires à créer :**
  - Vérifier que `usePersonFilmography` récupère bien la filmographie.
  - Vérifier que la page personne affiche la filmographie groupée par rôle.

### 15. Lien personne connexes → erreur TMDB 404
- **Symptôme :** La navigation vers une personne recommandée depuis la page personne échoue avec `TMDB request failed 404`.
- **Cause racine :** L’ID TMDB utilisé pour rediriger vers la page personne n’existe pas ou n’est pas correctement transmis.
- **Fichier concerné :** `apps/web/src/app/people/[id]/page.tsx`, `packages/tmdb-sync/src/index.ts`
- **Tests unitaires à créer :**
  - Vérifier que la navigation vers une personne connexe utilise le bon ID.
  - Vérifier que l’import par TMDB ID gère les IDs invalides.

### 16. Profil : layout onglets au lieu de modules empilés
- **Symptôme :** La page profil affiche les sections (favoris, listes, dataviz, notifications) sous forme d’onglets au lieu de les afficher les unes sous les autres.
- **Cause racine :** Le composant `ProfilePage` utilise un état `activeTab` pour n’afficher qu’une section à la fois.
- **Fichier concerné :** `apps/web/src/app/profile/page.tsx`
- **Tests unitaires à créer :**
  - Vérifier que toutes les sections sont visibles simultanément.
  - Vérifier l’ordre d’affichage : dataviz, favoris, listes, historique de visionnage, notifications.

### 17. Header : barre de recherche à déplacer en sidebar
- **Symptôme :** La barre de recherche est présente dans le header, ce qui encombre la navigation.
- **Cause racine :** Le composant `Header.tsx` intègre la barre de recherche.
- **Fichier concerné :** `apps/web/src/components/layout/Header.tsx`
- **Tests unitaires à créer :**
  - Vérifier que la barre de recherche n’est plus dans le header.
  - Vérifier que la barre de recherche est accessible depuis la sidebar.

---

## Modifications à faire

### A. Module personnes : filtre par badge rôle
- **Description :** Ajouter un filtre par rôle (acteur, réalisateur, scénariste, autre) dans la page personne et la filmographie, sous forme de badges cliquables.
- **Fichier concerné :** `apps/web/src/app/people/[id]/page.tsx`, `apps/web/src/components/people/Filmography.tsx`

### B. Module filmographie : filtre par badge rôle
- **Description :** Ajouter un filtre par badge rôle dans le module filmographie pour afficher/masquer les crédits par rôle.
- **Fichier concerné :** `apps/web/src/components/people/Filmography.tsx`

---

## Note

Chaque bug listé ci-dessus devrait avoir :
- Un test unitaire couvrant la casse d’erreur
- Un test d’intégration si applicable
- Une vérification manuelle après correction
