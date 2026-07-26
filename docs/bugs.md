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

## Bugs restants identifiés

### 4. Page film/série : `note_imdb.toFixed is not a function`
- **Symptôme :** Affichage de « Une erreur est survenue » sur la page de détail d’un titre.
- **Cause probable :** `note_imdb` est stocké en base sous forme de chaîne (ex: `"8.4"`), mais le composant UI appelle `.toFixed()` qui est une méthode de `number`.
- **Fichier concerné :** composant de détail de titre (frontend).
- **Tests unitaires à créer :**
  - Vérifier que le formatage de `note_imdb` gère les valeurs `string` et `number`.
  - Vérifier que la page de détail n’affiche pas d’erreur quand `note_imdb` est `null` ou une chaîne.

### 5. Page film/série : `Wikidata request failed 429`
- **Symptôme :** Import ou détail d’un titre échoue avec `Wikidata request failed 429`.
- **Cause probable :** Rate limit dépassé sur l’API Wikidata lors de l’import TMDB (`importPersonByTmdbId`).
- **Fichier concerné :** `packages/wikidata-client`, `packages/tmdb-sync`
- **Tests unitaires à créer :**
  - Vérifier le comportement quand Wikidata retourne `429 Too Many Requests`.
  - Vérifier la stratégie de retry / backoff.

### 6. Next.js : `ReferenceError: Badge is not defined`
- **Symptôme :** Erreur runtime dans `src/app/profile/page.tsx` ligne 198.
- **Cause racine :** Le composant `Badge` est utilisé mais non importé.
- **Fichier concerné :** `apps/web/src/app/profile/page.tsx`
- **Tests unitaires à créer :**
  - Vérifier que la page profile compile sans erreur.
  - Vérifier que `Badge` est bien importé et utilisé.

### 7. Bouton « Voir le calendrier complet » redirige vers la page profil
- **Symptôme :** Le bouton du calendrier sur la home/profil envoie vers `/profile` au lieu d’une page calendrier dédiée.
- **Cause racine :** Lien `href` incorrect ou page `/calendar` manquante.
- **Fichier concerné :** composant home/profil du frontend.
- **Tests unitaires à créer :**
  - Vérifier que le bouton pointe vers `/calendar`.
  - Vérifier que la page `/calendar` existe et affiche le calendrier.

### 8. Deux boutons « Profil » dans l’en-tête
- **Symptôme :** Doublon du bouton Profil dans la navbar.
- **Cause racine :** Duplication du composant/lien dans le layout header.
- **Fichier concerné :** composant header/navbar du frontend.
- **Tests unitaires à créer :**
  - Vérifier qu’un seul bouton « Profil » est présent dans le header.

---

## Note

Chaque bug listé ci-dessus devrait avoir :
- Un test unitaire couvrant la casse d’erreur
- Un test d’intégration si applicable
- Une vérification manuelle après correction
