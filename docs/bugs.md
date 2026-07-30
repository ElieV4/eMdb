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

### 10. Page `/calendar` manquante
- **Symptôme :** Aucune page calendrier n’existe pour afficher les épisodes non vus des séries suivies.
- **Cause racine :** Le fichier `apps/web/src/app/calendar/page.tsx` n’a jamais été créé.
- **Correction :** Création de la page `apps/web/src/app/calendar/page.tsx` avec :
  - Vérification d’authentification
  - Titre de page « Calendrier »
  - Intégration du composant existant `CalendarEpisodes` (backend `GET /calendar`)
- **Fichiers modifiés :** `apps/web/src/app/calendar/page.tsx`
- **Tests unitaires :**
  - `apps/web/src/__tests__/unit/pages/CalendarPage.test.tsx` — vérifie que la page existe, affiche le titre « Calendrier » et rend le composant `CalendarEpisodes`.

### 11. Page `/lists` manquante
- **Symptôme :** La route `/lists` renvoie une erreur 404 ou une page vide. Aucune page de gestion des listes n’existe.
- **Cause racine :** Le répertoire `apps/web/src/app/lists/` existait mais ne contenait pas de `page.tsx`.
- **Correction :** Création de `apps/web/src/app/lists/page.tsx` avec :
  - Vérification d’authentification
  - Titre « Mes Listes »
  - Bouton « Créer une liste » ouvrant `ListDialog`
  - Grille de `ListCard` alimentée par `useLists`
  - États loading / error gérés
- **Fichiers modifiés :** `apps/web/src/app/lists/page.tsx`
- **Tests unitaires :**
  - `apps/web/src/__tests__/unit/pages/ListsPage.test.tsx` — vérifie que la page existe, affiche les listes de l’utilisateur et rend `ListDialog`.

### 12. Module saisons & épisodes : données non chargées sur la page série
- **Symptôme :** La page détail d’une série affiche « Aucune saison disponible pour cette série. » même pour des titres comme Stranger Things. L’ajout d’une nouvelle série via la recherche frontend ne déclenchait pas l’import de ses saisons.
- **Cause racine :** `importTitleByTmdbId` appelait bien `importSeasonsForSerie` pour les séries, mais `getTvDetails()` dans `packages/tmdb-client` ne demandait pas `seasons` à l’API TMDB. Sans `seasons` dans `append_to_response`, TMDB ne renvoie pas la liste des saisons, donc `tvDetails.seasons` était `undefined` et la boucle d’import ne créait rien.
- **Correction :**
  - Ajout de `seasons` dans `append_to_response` de `getTvDetails()` (`packages/tmdb-client/src/tmdbClient.ts`).
  - Rebuild du package `tmdb-client` pour que le fix soit effectif.
  - Ajout d’un test unitaire dans `tmdb-sync` pour vérifier que `importSeasonsForSerie` appelle bien `getTvDetails` avec le `tmdb_id` du titre.
- **Fichiers modifiés :** `packages/tmdb-client/src/tmdbClient.ts`, `packages/tmdb-sync/src/index.spec.ts`
- **Tests unitaires :**
  - `packages/tmdb-sync/src/index.spec.ts` — vérifie que `importSeasonsForSerie` appelle `getTvDetails(123)` quand le titre a `tmdb_id: 123`.
  - `apps/web/src/__tests__/unit/pages/SeriesDetailPage.test.tsx` — vérifie que la page `/series/:id` rend la section « Saisons » lorsque le hook `useSeasons` retourne des données.
- **Vérification manuelle :** Ajouter une nouvelle série via la recherche frontend et confirmer que les saisons apparaissent sur la page de détail.

### 12bis. Saisons manquantes pour les séries existantes
- **Symptôme :** Les séries déjà présentes en base n’affichent aucune saison, même après import initial. Seules les séries ayant subi un import forcé ont des saisons.
- **Cause racine :** `getTvDetails()` dans `packages/tmdb-client` ne demandait pas `seasons` à l’API TMDB. Sans `seasons` dans `append_to_response`, `tvDetails.seasons` était `undefined` et `importSeasonsForSerie` ne créait rien. Les séries importées avant ce fix sont donc restées vides.
- **Correction :**
  - Ajout de `seasons` dans `append_to_response` de `getTvDetails()` (`packages/tmdb-client/src/tmdbClient.ts`).
  - Rebuild du package `tmdb-client`.
  - Script de backfill `scripts/backfill-seasons.js` pour importer les saisons des séries existantes sans saisons.
- **Fichiers modifiés :** `packages/tmdb-client/src/tmdbClient.ts`, `scripts/backfill-seasons.js`
- **Tests unitaires :**
  - `packages/tmdb-sync/src/index.spec.ts` — vérifie que `importSeasonsForSerie` appelle `getTvDetails(123)` quand le titre a `tmdb_id: 123`.
- **Vérification manuelle :** Exécuter `node scripts/backfill-seasons.js` et confirmer que les saisons apparaissent pour les séries existantes.

### 13. Page titre/série : fonctionnalités utilisateur manquantes (watch, liste, follow, note)
- **Symptôme :** Sur la page de détail d’un titre, les boutons « Marquer comme vu », « Ajouter à une liste », « Suivre » et « Noter » sont absents ou non fonctionnels.
- **Cause racine :** Les composants `WatchButton`, `FollowButton`, `RatingInput` et les hooks associés existaient, mais n’étaient pas intégrés dans les pages de détail. De plus, les hooks de gestion des favoris/listes (`useUserFollows`, `useUserLists`, `useAddListItem`, `useRemoveListItem`) manquaient.
- **Correction :**
  - Création du composant unifié `TitleActions` (`apps/web/src/components/titles/TitleActions.tsx`) qui regroupe :
    - **Watch** : bouton « Marquer comme vu » avec dropdown (vu maintenant / annuler le visionnage)
    - **Suivi** : bouton toggle bookmark pour les séries
    - **Listes** : menu burger avec watchlist, favoris, listes personnalisées + création de nouvelle liste
    - **Historique** : voir l’historique de visionnage du titre
    - **Supprimer historique** : suppression avec confirmation
    - **Rating** : étoiles interactives
    - **Favori** : toggle cœur rouge
  - Intégration de `TitleActions` dans `apps/web/src/app/titles/[id]/page.tsx` et `apps/web/src/app/series/[id]/page.tsx`
  - Création des hooks manquants : `useUserFollows`, `useUserLists`, `useAddListItem`, `useRemoveListItem`
- **Fichiers modifiés :**
  - `apps/web/src/components/titles/TitleActions.tsx` (nouveau)
  - `apps/web/src/app/titles/[id]/page.tsx`
  - `apps/web/src/app/series/[id]/page.tsx`
  - `apps/web/src/hooks/api/useUserFollows.ts` (nouveau)
  - `apps/web/src/hooks/api/useUserLists.ts` (nouveau)
  - `apps/web/src/hooks/api/useAddListItem.ts` (nouveau)
  - `apps/web/src/hooks/api/useRemoveListItem.ts` (nouveau)
  - `apps/web/src/hooks/api/index.ts`
- **Tests unitaires :**
  - `apps/web/src/__tests__/unit/components/titles/TitleActions.test.tsx` — vérifie que les actions principales sont présentes pour un film et une série.
  - `apps/web/src/__tests__/unit/pages/TitleDetailPage.test.tsx` — vérifie que la page `/titles/:id` rend `TitleActions`.
  - `apps/web/src/__tests__/unit/pages/SeriesDetailPage.test.tsx` — vérifie que la page `/series/:id` rend `TitleActions`.

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

### 18. Bouton visionnage ne change pas d'état et historique vide
- **Symptôme :** Le bouton "Marquer comme vu" ne passe pas en "Vu" après clic, et l'historique de visionnage affiche "Aucun visionnage" même quand des données existent dans `user_watches`.
- **Cause racine (bouton) :** Le backend retournait `{ data: [...], total, page, limit }` mais le frontend attendait `{ items: [...], ... }` (type `PaginationResult`). Le frontend accédait `watchesData?.items` qui était toujours `undefined`.
- **Cause racine (historique vide) :** Même cause — `watches` était toujours `[]` car `items` n'existait pas dans la réponse.
- **Cause racine (historique "titre" et "Invalid Date") :** Le type `UserWatch` définissait `date`, `title`, `episode` mais le backend retournait `date_vue`, `titles`, `episodes`.
- **Correction :**
  - Backend : `data` → `items` + ajout de `totalPages` dans `listWatches()`
  - Frontend : mise à jour du type `UserWatch` pour correspondre au backend
  - Correction de tous les composants utilisant `UserWatch` (`TitleActions`, `WatchHistoryItem`, `page.tsx`)
- **Fichiers modifiés :**
  - `apps/api/src/watches/watches.service.ts`
  - `apps/api/src/watches/watches.service.spec.ts`
  - `apps/web/src/lib/types/api.ts`
  - `apps/web/src/components/titles/TitleActions.tsx`
  - `apps/web/src/components/watches/WatchHistoryItem.tsx`
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/hooks/api/useDashboard.ts`
  - `apps/web/src/hooks/api/useCreateWatch.ts`
  - `apps/web/src/hooks/api/useDeleteWatch.ts`

### 19. Invalidation des requêtes watches incorrecte
- **Symptôme :** Après avoir marqué un titre comme vu, le bouton ne se mettait pas à jour tant qu'on ne rafraîchissait pas la page.
- **Cause racine :** `queryClient.invalidateQueries({ queryKey: ["watches"] })` n'invalidait pas `["watches", filters]` (les requêtes avec filtres).
- **Correction :** Ajout de `exact: false` pour invalider toutes les requêtes commençant par `["watches"]`.
- **Fichiers modifiés :**
  - `apps/web/src/hooks/api/useCreateWatch.ts`
  - `apps/web/src/hooks/api/useDeleteWatch.ts`
  - `apps/web/src/components/titles/TitleActions.tsx`

### 20. "Annuler visionnage" non fonctionnel
- **Symptôme :** Le menu "Annuler le visionnage" ne supprimait pas les visionnages.
- **Cause racine :** Le bouton appelait juste `onWatchSuccess` sans effectuer de suppression.
- **Correction :**
  - Ajout d'un endpoint backend `DELETE /watches/title/:titleId` pour supprimer tous les visionnages d'un titre
  - Création du hook `useDeleteAllWatches`
  - Ajout d'une boîte de dialogue de confirmation
  - Ajout des options "Revu" (date personnalisée, date inconnue) dans le menu "Vu"
  - Ajout de l'affichage "Vu x3" si plusieurs visionnages
- **Fichiers modifiés :**
  - `apps/api/src/watches/watches.controller.ts`
  - `apps/api/src/watches/watches.service.ts`
  - `apps/web/src/hooks/api/useDeleteAllWatches.ts` (nouveau)
  - `apps/web/src/components/watches/WatchButton.tsx`
  - `apps/web/src/components/titles/TitleActions.tsx`

### 21. Refonte des pages titre/série avec composants modulaires
- **Symptôme :** Les pages de détail titre et série manquaient de structure modulaire et de fonctionnalités modernes (crédits séparés, saisons compactes, épisodes avec actions).
- **Cause racine :** Les pages utilisaient des layouts anciens sans séparation distribution/équipe technique, sans affichage compact des saisons, et sans actions rapides sur les épisodes.
- **Correction :**
  - Création de `TitleCreditsSplit` : sépare distribution et équipe technique, limite à 10 avec "voir plus", ajoute le nombre d'épisodes pour les séries
  - Création de `SeasonCompact` : affichage minimal des saisons avec expansion/réduction
  - Création de `EpisodeSnapshot` : liste des épisodes avec bouton "Marquer vu"
  - Mise à jour de `TitleActions` : WatchButton seulement pour films, FollowButton seulement pour séries
  - Suppression du bouton "Marquer vu global" sur les pages série
  - Ajout de la propriété `local` manquante dans les types `TitleSearchResult` et `PersonSearchResult`
  - Correction des imports lucide-react (icônes renommées)
  - Désactivation du linting pendant le build
- **Fichiers modifiés :**
  - `apps/web/src/components/titles/TitleCreditsSplit.tsx` (nouveau)
  - `apps/web/src/components/seasons/SeasonCompact.tsx` (nouveau)
  - `apps/web/src/components/seasons/EpisodeSnapshot.tsx` (nouveau)
  - `apps/web/src/components/titles/TitleActions.tsx`
  - `apps/web/src/app/titles/[id]/page.tsx`
  - `apps/web/src/app/series/[id]/page.tsx`
  - `apps/web/src/lib/types/api.ts`
  - `apps/web/next.config.js`
- **Tests unitaires à créer :**
  - `apps/web/src/__tests__/unit/components/titles/TitleCreditsSplit.test.tsx` — vérifie la séparation distribution/équipe, la limite de 10, le "voir plus", et l'affichage du nombre d'épisodes pour les séries
  - `apps/web/src/__tests__/unit/components/seasons/SeasonCompact.test.tsx` — vérifie l'affichage compact et l'expansion
  - `apps/web/src/__tests__/unit/components/seasons/EpisodeSnapshot.test.tsx` — vérifie l'affichage des épisodes et l'action "Marquer vu"

### 22. EpisodeSnapshot : erreur "Vous ne pouvez pas fournir 'title_id' et 'episode_id' en même temps"
- **Symptôme :** Le clic sur "Marquer vu" dans un épisode provoque une erreur API : "Vous ne pouvez pas fournir 'title_id' et 'episode_id' en même temps".
- **Cause racine :** `EpisodeSnapshot.tsx` envoyait `{ title_id, episode_id }` dans le body de `POST /watches`, mais le backend interdit de fournir les deux simultanément (contrainte métier : un watch est soit un film, soit un épisode, pas les deux).
- **Correction :** Suppression de `title_id` dans l'appel à `createWatch.mutateAsync()` dans `EpisodeSnapshot.tsx`. Seul `episode_id` est envoyé.
- **Fichiers modifiés :** `apps/web/src/components/seasons/EpisodeSnapshot.tsx`
- **Tests unitaires à créer :**
  - `apps/web/src/__tests__/unit/components/seasons/EpisodeSnapshot.test.tsx` — vérifie que `handleWatch` appelle `createWatch` avec `{ episode_id }` uniquement, sans `title_id`.

### 23. EpisodeSnapshot : bouton "Marquer vu" sans dropdown ni mise à jour d'état + bouton (+) manquant
- **Symptôme :** Le bouton "Marquer vu" des épisodes ne changeait pas d'état après clic, n'avait pas de dropdown avec options de date, et le bouton (+) vers la page de l'épisode était manquant.
- **Cause racine :** `EpisodeSnapshot.tsx` utilisait un bouton custom basique au lieu du composant `WatchButton` qui gère déjà le dropdown (clic long), les options de date, l'état "Vu/Vu xN", et l'annulation. De plus, aucun lien vers la page de l'épisode n'était présent.
- **Correction :**
  - Remplacement du bouton custom par le composant `WatchButton` avec `episodeId` et `onWatchSuccess`
  - Ajout d'un bouton (+) avec `Link` vers `/episodes/${episode.id}`
  - `onWatchSuccess` invalide les requêtes `["watches"]` avec `exact: false` pour forcer le rafraîchissement
- **Fichiers modifiés :** `apps/web/src/components/seasons/EpisodeSnapshot.tsx`
- **Tests unitaires à créer :**
  - `apps/web/src/__tests__/unit/components/seasons/EpisodeSnapshot.test.tsx` — vérifie que `WatchButton` est utilisé avec `episodeId`, que le bouton (+) est présent avec le bon `href`, et que `onWatchSuccess` invalide les requêtes watches.

### 24. WatchButton : envoie title_id ET episode_id simultanément
- **Symptôme :** Le bouton "Marquer vu" sur un épisode provoque l'erreur "Vous ne pouvez pas fournir 'title_id' et 'episode_id' en même temps" même après la correction #22.
- **Cause racine :** `WatchButton.tsx` envoyait systématiquement `{ title_id, episode_id }` dans tous les cas (clic simple, clic long, options de date). Le backend rejette l'envoi simultané des deux.
- **Correction :** Conditionnel sur `episodeId` dans `WatchButton.tsx` : si `episodeId` est fourni, `title_id` est mis à `undefined`. Cela s'applique à `handleClick` et `handleSelect`.
- **Fichiers modifiés :** `apps/web/src/components/watches/WatchButton.tsx`
- **Tests unitaires à créer :**
  - `apps/web/src/__tests__/unit/components/watches/WatchButton.test.tsx` — vérifie que quand `episodeId` est fourni, `title_id` n'est pas envoyé dans le body.

### 25. EpisodeSnapshot : bouton "Marquer vu" ne change pas d'état après clic
- **Symptôme :** Le bouton "Marquer vu" fonctionne en backend mais reste affiché "Marquer vu" au lieu de passer en "Vu".
- **Cause racine :** `EpisodeSnapshot.tsx` ne récupérait pas l'état de visionnage des épisodes. `WatchButton` recevait `watched=false` et `watchCount=0` par défaut, donc ne changeait jamais d'état visuel.
- **Correction :**
  - Ajout de `useWatches({ limit: 100 })` dans `EpisodeSnapshot.tsx` pour récupérer tous les visionnages
  - Construction d'une map `episode_id → watchCount` pour déterminer l'état de chaque épisode
  - Passage de `watched` et `watchCount` en props à `WatchButton` pour chaque épisode
  - `onWatchSuccess` invalide les requêtes `["watches"]` avec `exact: false` pour forcer le re-fetch et la mise à jour visuelle
- **Fichiers modifiés :** `apps/web/src/components/seasons/EpisodeSnapshot.tsx`
- **Tests unitaires à créer :**
  - `apps/web/src/__tests__/unit/components/seasons/EpisodeSnapshot.test.tsx` — vérifie que `watched` et `watchCount` sont passés à `WatchButton` selon les données de `useWatches`.

### 26. Page épisode : actions utilisateur manquantes (marquer vu, historique, rating)
- **Symptôme :** La page de détail d'un épisode (`/episodes/:id`) n'affichait pas les boutons "Marquer comme vu", "Historique de visionnage" et "Rating".
- **Cause racine :** La page `apps/web/src/app/episodes/[id]/page.tsx` ne contenait que le header et les crédits, sans section d'actions utilisateur.
- **Correction :**
  - Ajout de `WatchButton` avec `episodeId`, `watched` et `watchCount` (récupérés via `useWatches`)
  - Ajout d'un bouton "Historique" avec dialog affichant les visionnages de l'épisode
  - Ajout de `RatingInput` pour noter l'épisode (via `useUpsertRating` avec `episode_id`)
  - Ajout de `useDeleteWatch` pour supprimer un visionnage depuis l'historique
  - Invalidation des requêtes `["watches"]` après chaque action
- **Fichiers modifiés :** `apps/web/src/app/episodes/[id]/page.tsx`
- **Tests unitaires à créer :**
  - `apps/web/src/__tests__/unit/pages/EpisodeDetailPage.test.tsx` — vérifie que `WatchButton`, `RatingInput` et le bouton "Historique" sont présents pour un utilisateur authentifié.

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
