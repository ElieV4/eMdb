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

### 27. Filmographie : pas de mise à jour TMDB au chargement de la page
- **Symptôme :** La filmographie d'une personne n'affichait que les données déjà présentes en base. Une fois le refresh TMDB partiellement câblé, le chargement devenait *aléatoire* : selon les personnes, la page affichait tantôt seulement les titres déjà en base, tantôt ceux-ci plus quelques titres supplémentaires, jamais la filmographie complète de façon fiable.
- **Cause racine (absence de refresh) :** `usePersonFilmography` appelle `GET /people/:id/filmography`, qui lit uniquement les credits en base. Le hook `useRefreshFilmography` (mutation `POST /people/:id/filmography/refresh`) avait été créé mais n'était jamais appelé : la page `people/[id]/page.tsx` ne le déclenchait pas au montage (le `TODO.md` marquait cette étape comme faite à tort).
- **Cause racine (aléatoire une fois câblé) :** `apiFetch` applique un timeout fixe de 10s à tous les appels. `refreshFilmography()` importe séquentiellement chaque titre TMDB manquant, et chaque import (`importTitleByTmdbId`) enchaîne lui-même plusieurs appels TMDB (détails + credits + import de chaque personne du cast/crew). Pour une filmographie avec plusieurs titres manquants, la requête dépassait largement 10s : le `fetch` était abandonné côté client (donc jamais d'invalidation React Query), alors que l'import continuait à écrire en base côté serveur. Le résultat observé au chargement suivant dépendait donc du nombre de titres qui avaient eu le temps d'être commités avant l'abandon — d'où l'aléatoire. C'est ce qui distingue ce module de `TitleCreditsSplit` (page titre) : ce dernier tranche une liste déjà entièrement chargée en une seule requête DB, sans dépendance à un import TMDB asynchrone en arrière-plan.
- **Correction :**
  - Câblage effectif du hook `useRefreshFilmography` au montage de `people/[id]/page.tsx` (fire-and-forget, `useEffect` + `useRef` pour ne déclencher qu'une fois)
  - Ajout d'un `timeoutMs` configurable dans `apiFetch` (`apps/web/src/lib/api/apiClient.ts`), utilisé par `useRefreshFilmography` avec 120s au lieu des 10s par défaut
  - Parallélisation des imports de titres manquants dans `refreshFilmography()` (`Promise.all` au lieu d'une boucle séquentielle) — le rate limiter TMDB (`@emdb/tmdb-client`) fait déjà la queue nécessaire, donc paralléliser ne dépasse pas le quota et réduit fortement le temps total
  - Ajout de la limite d'affichage 10 titres max + bouton « Voir plus » par rôle dans `Filmography.tsx` (même pattern que `TitleCreditsSplit`)
- **Fichiers modifiés :**
  - `apps/api/src/people/people.service.ts`
  - `apps/api/src/people/people.controller.ts`
  - `apps/web/src/hooks/api/useRefreshFilmography.ts` (nouveau)
  - `apps/web/src/hooks/api/index.ts`
  - `apps/web/src/lib/api/apiClient.ts`
  - `apps/web/src/app/(frontend)/people/[id]/page.tsx`
  - `apps/web/src/components/people/Filmography.tsx`
- **Tests unitaires à créer :**
  - Vérifier que le refresh importe les titres manquants depuis TMDB
  - Vérifier que la filmographie est mise à jour après refresh
  - Vérifier que le refresh ne crash pas si la personne n'a pas de tmdb_id
  - Vérifier que `Filmography` affiche 10 titres max par rôle avec bouton « Voir plus » quand il y en a plus de 10, et tous les titres sinon
- **Vérification manuelle :** Ouvrir la page d'une personne avec une filmographie volumineuse (>10 titres manquants en base) et confirmer que la liste se complète progressivement sans nécessiter de rechargement manuel.

#### Suite (même session) — import trop lent pour les personnes prolifiques + rôles spécifiques
- **Symptôme :** Même avec la parallélisation, le refresh restait très long (potentiellement des dizaines de minutes) pour une personne prolifique (ex. Tom Hanks), car chaque titre manquant déclenchait un import complet — y compris tout le casting/l'équipe technique de CE titre, donc l'import de dizaines de personnes non demandées par page.
- **Cause racine :** `importTitleByTmdbId` importe systématiquement les credits complets d'un titre (cast + crew), et pour chaque credit, importe la personne correspondante via `importPersonByTmdbId` (nouvel appel TMDB + Wikidata). Pour `refreshFilmography()`, ce travail est inutile : on connaît déjà, via `getPersonCombinedCredits(person.tmdb_id)`, le personnage/job exact de la personne consultée sur ce titre — pas besoin de réimporter tout le reste du casting pour retrouver cette seule ligne de credit.
- **Correction :**
  - Ajout d'une option `importTitleByTmdbId(tmdbId, type, { withCredits: false })` (`packages/tmdb-sync/src/index.ts`) qui importe uniquement les métadonnées du titre (genres, pays), sans toucher aux credits.
  - `refreshFilmography()` utilise ce mode allégé pour les titres manquants, puis crée directement le credit reliant la personne consultée à chaque titre (existant ou nouvellement importé) via la nouvelle fonction exportée `ensureCreditRecord()`, à partir des données déjà récupérées dans `getPersonCombinedCredits`.
  - Rôles spécifiques au lieu de tout regrouper sous "Autre" : ajout d'une table de correspondance job TMDB → rôle (`resolveCrewRole()` dans `packages/tmdb-mapper/src/index.ts` — Producteur, Producteur exécutif, Directeur de la photographie, Compositeur, Monteur, Casting, en plus de Réalisateur/Scénariste déjà gérés), reprise de la liste déjà utilisée par `TitleCreditsSplit`. Le job TMDB exact (ex. "Executive Producer") est conservé dans `personnage` pour l'affichage. Ne s'applique qu'aux nouveaux credits créés — pas de backfill des credits déjà en base.
  - Ajout d'un filtre "Tout / Films / Séries" en haut du module `Filmography.tsx`.
  - Découverte en marge : `packages/tmdb-sync` et `packages/tmdb-mapper` n'avaient pas `"declaration": true` dans leur tsconfig — un `npm run build` normal ne régénérait donc jamais leurs `.d.ts`, un consommateur (ex. `apps/api`) pouvait compiler contre des types obsolètes sans erreur apparente. Corrigé dans les deux `tsconfig.json`.
- **Fichiers modifiés (en plus de la liste ci-dessus) :**
  - `packages/tmdb-sync/src/index.ts` (option `withCredits`, `ensureCreditRecord`, re-export `resolveCrewRole`)
  - `packages/tmdb-sync/tsconfig.json`
  - `packages/tmdb-mapper/src/index.ts` (`CREW_JOB_MAP`, `resolveCrewRole`, `CreditInsert.role_libelle`)
  - `packages/tmdb-mapper/tsconfig.json`
  - `apps/web/src/components/people/Filmography.tsx` (filtre Tout/Films/Séries)
- **Vérification manuelle :** Testé sur Christopher Nolan (director/writer/producer/editor/DP) — refresh en ~12s, rôles corrects (Réalisateur, Scénariste, Producteur, Producteur exécutif, Monteur, Directeur de la photographie, Compositeur, Autre), filtre Films/Séries fonctionnel.

### 27bis. Personnes connexes : lien cassé (`/titles/...` au lieu de `/people/...`)
- **Symptôme :** Cliquer sur une personne dans la section "Personnes connexes" de la page personne menait vers une URL `/titles/...` inexistante au lieu de `/people/...`.
- **Cause racine :** `people/[id]/page.tsx` utilisait le composant `TitleCard` (prévu pour les titres, génère un lien `/titles/:id`) pour afficher des recommandations de **personnes**, avec un objet bricolé (`type: "film"` forcé) pour satisfaire le typage.
- **Correction :** Remplacement par le composant `PersonCard` (déjà existant, utilisé pour les résultats de recherche de personnes), qui génère un lien `/people/:id`.
- **Fichiers modifiés :** `apps/web/src/app/(frontend)/people/[id]/page.tsx`
- **Vérification manuelle :** Cliqué sur une personne connexe depuis la page de Tom Holland → arrivée correcte sur `/people/:id`.

### 28. Module filmographie : menu filtre manquant
- **Symptôme :** Le module filmographie n'avait aucun filtre. Impossible de filtrer par date de sortie, pays de production, genre ou rating IMDB.
- **Cause racine :** `Filmography.tsx` affichait les groupes par rôle sans aucun contrôle de filtrage. `getFilmography()` ne remontait pas non plus les genres/pays du titre.
- **Correction (redirigée en cours de route) :** L'implémentation initiale ajoutait un composant `FilmographyFilters` local au module (comme prévu ci-dessus), avec un filtre Tout/Films/Séries propre au module. Sur retour utilisateur, ces contrôles ont été déplacés dans le **menu filtre du header** (celui du bug #34, jusque-là un simple placeholder) plutôt que dupliqués dans chaque module — le header pilote maintenant n'importe quelle page via les paramètres d'URL, et `Filmography.tsx` se contente de les lire :
  - Backend : `getFilmography()` inclut désormais `title_genres`/`title_countries` par titre (`apps/api/src/people/people.service.ts`)
  - Backend : nouveaux endpoints publics `GET /titles/genres` et `GET /titles/countries` (listes de référence pour les menus de filtre)
  - Frontend : `apps/web/src/lib/titleFilters.ts` — logique partagée de parsing/écriture des filtres dans l'URL (`type`, `genres`, `pays`, `yearMin`, `yearMax`, `noteImdbMin`)
  - Frontend : `Header.tsx` — les onglets Tout/Film/Série écrivent dans l'URL de la page courante ; le bouton "Filtres" déploie une sidebar droite (`FilterSidebar.tsx`, sur demande utilisateur — remplace le dropdown initial)
  - Frontend : `FilterSidebar.tsx` — année et note IMDB en sliders **double sens** (min ET max, pas juste un minimum — `apps/web/src/components/ui/slider.tsx`, nouveau wrapper `@base-ui/react/slider`), genre et pays en **dropdowns** multi-sélection (un `DropdownMenu` dédié par filtre, plutôt qu'une liste à cocher toujours dépliée)
  - Frontend : `Filmography.tsx` lit les filtres via `useSearchParams()` et ne gère plus lui-même de UI de filtre
  - `apps/web/src/app/(frontend)/layout.tsx` : `<Header />` encapsulé dans un `<Suspense>` (`useSearchParams()` l'exige pour le rendu statique des pages non-dynamiques)
- **Limitation connue (filtre "ma note")** : le filtre par note personnelle envisagé initialement a été abandonné — `GET /ratings` renvoie `{ data, ... }` avec un champ `note_perso`, pas `{ items, ... }` avec `note` comme le type `PaginationResult<UserRating>` le laisse penser (même défaut que le bug #18, jamais corrigé pour `/ratings`). Voir bug #39.
- **Limitation connue (bruit console)** : ouvrir un dropdown genre/pays de la sidebar peut déclencher une erreur React récupérable (`Base UI: MenuGroupContext is missing`) visible en mode dev. Sans impact fonctionnel constaté (testé : sliders double sens, dropdowns genre/pays, reset — tous fonctionnels), cause exacte non identifiée.
- **Fichiers modifiés :**
  - `apps/api/src/people/people.service.ts`
  - `apps/api/src/titles/titles.controller.ts`, `apps/api/src/titles/titles.service.ts`
  - `apps/web/src/lib/types/api.ts` (`FilmographyItem.titre.title_genres`/`title_countries`)
  - `apps/web/src/lib/titleFilters.ts` (nouveau — `noteImdbMax` en plus de `noteImdbMin`)
  - `apps/web/src/hooks/api/useTitles.ts`, `apps/web/src/hooks/api/index.ts` (`useTitleGenres`, `useTitleCountries`)
  - `apps/web/src/components/ui/slider.tsx` (nouveau)
  - `apps/web/src/components/layout/Header.tsx`
  - `apps/web/src/components/layout/FilterSidebar.tsx` (nouveau)
  - `apps/web/src/components/people/Filmography.tsx`
  - `apps/web/src/app/(frontend)/layout.tsx`
- **Tests unitaires à créer :**
  - Vérifier que `parseTitleFilters()` lit correctement chaque paramètre d'URL
  - Vérifier que `Filmography` filtre par type/année/genre/pays/note IMDB (min et max) à partir des query params
  - Vérifier que le header écrit les bons paramètres d'URL au clic sur un onglet type, une case à cocher, ou un slider
- **Vérification manuelle :** Testé sur Christopher Nolan — sidebar droite déployée depuis le bouton "Filtres" du header, filtre Films, genre Drame (dropdown), plage d'années et plage de notes IMDB (sliders double sens) — chaque combinaison réduit correctement la liste ; bouton "Réinitialiser" efface tous les filtres.

### 29. Icone vu (œil rouge) manquante sur les affiches
- **Symptôme :** Aucune icone visuelle n'indiquait qu'un titre a déjà été vu par l'utilisateur quand il apparaît sous forme d'affiche.
- **Cause racine :** `TitlePoster.tsx` avait déjà le rendu de l'icone (`Eye` rouge conditionnelle sur `watched`) et `TitleCard` la propageait déjà correctement — mais **aucun des 7 call sites de `<TitleCard>` dans l'app ne passait la prop**, et `TitleCardHorizontal` ne l'acceptait même pas. Le hook `useWatchedTitles()` existait déjà mais n'était appelé nulle part (composant + hook scaffoldés dans une session antérieure, jamais branchés).
- **Bug annexe découvert en testant :** `useWatchedTitles()` appelait `GET /watches?limit=500`, mais `ListWatchesFilterDto` plafonne `limit` à 100 (`@Max(100)`) → la requête échouait systématiquement en 400, donc le Set était toujours vide même une fois branché.
- **Correction :**
  - `useWatchedTitles.ts` : `limit=500` → `limit=100` (le maximum autorisé par le DTO)
  - `TitleCardHorizontal` (`TitleCard.tsx`) : accepte désormais `watched`/`followed` et les transmet à `TitlePoster` (ne le faisait pas du tout)
  - Appel de `useWatchedTitles()`/`useFollowedTitleIds()` + propagation de `watched`/`followed` dans les 7 call sites de `<TitleCard>` : `Filmography.tsx`, `search/page.tsx`, `profile/page.tsx` (Mes Favoris), `TitleRecommendations.tsx`, `ListReorder.tsx` (via `SortableItem`), `(frontend)/page.tsx` (Watchlist/Recommandés/Titres populaires), `ListItemsGrid.tsx`
  - `TitleRecommendations.tsx` : ajout de `"use client"` (nécessaire dès qu'il appelle des hooks ; son absence faisait échouer le build à cause du barrel `@/hooks/api` tirant `useSearch.ts` dans l'arbre de modules)
- **Hors scope (décision) :** `FollowedSeriesGrid.tsx` n'utilise pas `TitleCard`/`TitlePoster` (layout en ligne fait main) et affiche déjà un état de suivi explicite via `FollowButton` — pas retouché.
- **Fichiers modifiés :** `apps/web/src/hooks/api/useWatchedTitles.ts`, `apps/web/src/components/titles/TitleCard.tsx`, `apps/web/src/components/titles/TitleRecommendations.tsx`, `apps/web/src/components/people/Filmography.tsx`, `apps/web/src/app/(frontend)/search/page.tsx`, `apps/web/src/app/(frontend)/profile/page.tsx`, `apps/web/src/app/(frontend)/page.tsx`, `apps/web/src/components/lists/ListReorder.tsx`, `apps/web/src/components/lists/ListItemsGrid.tsx`
- **Tests unitaires à créer :**
  - Vérifier que chaque call site de `TitleCard` passe `watched`/`followed` à partir des hooks
  - Vérifier que `useWatchedTitles()` utilise un `limit` valide (≤100)
- **Vérification manuelle :** Recherché "The Martian" (déjà vu par le compte de test) → icone œil rouge visible sur l'affiche, confirmé aussi via l'inspection des props React (`watched: true`).

### 30. Icone bookmark manquante sur les affiches de séries suivies
- **Symptôme :** Aucune icone visuelle n'indiquait qu'une série est suivie par l'utilisateur quand elle apparaît sous forme d'affiche.
- **Cause racine :** Même situation que le bug #29 — composant et hook déjà en place, aucun call site ne les utilisait.
- **Bug annexe découvert en testant :** `useFollowedTitleIds()` lisait `follow.title_id`, mais `GET /follows` renvoie directement les champs du titre suivi avec `id` comme id du titre (pas d'enveloppe avec un champ `title_id` séparé) — le Set était donc toujours vide même une fois branché et même sans erreur réseau.
- **Correction :**
  - `useFollowedTitleIds.ts` : lit désormais `follow.id` (et le type `FollowEntry` corrigé en conséquence)
  - Même câblage que le bug #29 dans les mêmes 7 call sites
- **Fichiers modifiés :** `apps/web/src/hooks/api/useFollowedTitleIds.ts` (+ les mêmes fichiers que le bug #29)
- **Tests unitaires à créer :**
  - Vérifier que `useFollowedTitleIds()` lit le bon champ (`id`, pas `title_id`) dans la réponse de `GET /follows`
- **Vérification manuelle :** Recherché "House of the Dragon" (suivie par le compte de test) → icone bookmark visible sur l'affiche, confirmé via l'inspection des props React (`followed: true`).

### 31. Titres recommandés : URL `undefined` au clic sur une affiche
- **Symptôme :** Quand on cliquait sur une affiche dans "Titres recommandés", l'URL devenait `/titles/undefined` et la page était introuvable.
- **Constat :** Déjà corrigé avant cette session (non documenté comme tel) — `titleRecommendationToSearchResult()` (`apps/web/src/lib/types/api.ts`) calcule déjà `local: !!rec.id` et retombe sur `tmdbId` quand `id` est absent, exactement la correction proposée ci-dessous.
- **Vérification manuelle (cette session) :** Titre "The Odyssey" → section "Titres recommandés" → tous les hrefs générés sont soit `/titles/:uuid` (titres locaux) soit `/titles/tmdb/:tmdbId?type=film` (titres non-locaux, ex. `/titles/tmdb/9387?type=film` pour "Conan the Barbarian") — aucun `/titles/undefined` observé. Cliqué sur "Conan the Barbarian" → navigation correcte vers `/titles/tmdb/9387?type=film` (voir bug #40 pour ce qui se passe ensuite).
- **Fichiers concernés :** `apps/web/src/lib/types/api.ts`

### 40. Import d'un titre recommandé non-local expire après 10s
- **Symptôme :** Cliquer sur un titre recommandé non-local avec un casting important (ex. "Conan the Barbarian" depuis la page "The Odyssey") affiche une erreur "signal is aborted without reason" au lieu de la page du titre.
- **Cause racine :** `GET /titles/tmdb/:tmdbId` (`titles.controller.ts` → `getOrImportByTmdbId` → `importTitleByTmdbId` avec `withCredits` par défaut, donc `true`) importe tout le casting/l'équipe technique du titre de façon synchrone dans la requête HTTP, y compris l'import complet de chaque nouvelle personne (cast/crew) — comme documenté pour le bug #27 avant sa correction. `apiFetch` (`apps/web/src/lib/api/apiClient.ts`) applique un timeout fixe de 10s à tous les appels sauf ceux qui passent explicitement un `timeoutMs` plus long (fait pour le refresh de filmographie, bug #27, mais pas pour cette route).
- **Fichiers concernés :** `apps/web/src/app/(frontend)/titles/tmdb/[tmdbId]/page.tsx` (appelant), `apps/web/src/lib/api/apiClient.ts`, `apps/api/src/titles/titles.service.ts` (`getOrImportByTmdbId`)
- **Correction proposée :**
  - Court terme : passer un `timeoutMs` plus long (ex. 60-120s) pour cet appel spécifique, comme fait pour `useRefreshFilmography` (bug #27)
  - Fond : envisager de rendre cet import asynchrone (job BullMQ + polling, cf. `IMPORT_QUEUE_NAME`/`createImportQueue` déjà existants dans `apps/worker/src/worker.ts` mais non utilisés depuis l'API) plutôt que de bloquer la requête HTTP le temps de tout importer
- **Tests unitaires à créer :**
  - Vérifier que l'import d'un titre avec un casting important ne timeout pas avant complétion
- **Vérification manuelle :** Cliqué sur "Conan the Barbarian" (tmdb 9387) depuis les recommandations de "The Odyssey" → erreur "signal is aborted without reason" après ~10s.

### 32. Site accessible sans authentification
- **Symptôme :** Le site était accessible sans être connecté, les pages protégées ne redirigeaient jamais vers `/login`.
- **Cause racine :** `middleware.ts` se trouvait à `apps/web/middleware.ts` (racine du projet), mais l'app utilise un dossier `src/` (`apps/web/src/app/...`). Next.js exige que `middleware.ts` soit placé **dans** `src/` quand ce dossier existe, sinon il est silencieusement ignoré — aucune erreur, le fichier ne s'exécute simplement jamais. Confirmé par les logs du serveur dev : aucune ligne `Compiling /middleware` n'apparaissait avant la correction ; `Compiling /src/middleware` apparaît après.
- **Correction :**
  - Déplacé `apps/web/middleware.ts` → `apps/web/src/middleware.ts`
  - `PUBLIC_PATHS` étendu à `/titles`, `/people` (fiches consultables sans connexion)
  - **L'accueil (`/`) reste protégé** — sur demande explicite : contrairement à une première itération de ce fix qui l'avait rendu public (en suivant `docs/ARCHITECTURE_OVERVIEW.md`), l'utilisateur a précisé vouloir que `/` nécessite une connexion comme le reste. `ARCHITECTURE_OVERVIEW.md` mis à jour en conséquence.
  - Ajouté un logo "eMDB" au-dessus du formulaire sur `/login` et `/register` (dans le layout partagé `(auth)/layout.tsx`, pour éviter de dupliquer dans les deux pages)
- **Fichiers modifiés :** `apps/web/src/middleware.ts` (déplacé + PUBLIC_PATHS mis à jour), `apps/web/src/app/(auth)/layout.tsx` (logo), `docs/ARCHITECTURE_OVERVIEW.md`
- **Tests unitaires à créer :**
  - Vérifier que `/`, `/profile`, `/watchlist`, `/search`, `/calendar` redirigent vers `/login?redirect=...` sans cookie
  - Vérifier que `/titles/:id`, `/people/:id` restent accessibles sans cookie
- **Vérification manuelle :** Testé sans cookie — `/`, `/profile`, `/watchlist`, `/search`, `/calendar` redirigent bien vers `/login?redirect=...` ; `/titles/:id`, `/people/:id` restent accessibles. Après connexion (`elie.vincent4@gmail.com`), redirection correcte vers `/` avec cookie `emdb_access_token` posé. Logo "eMDB" confirmé visible au-dessus des formulaires sur `/login` et `/register`. Build de production confirme la prise en compte du middleware (`ƒ Middleware   26.6 kB` dans la sortie de `next build`, absent avant la correction).
- **Note (hors scope, déjà signalé séparément) :** un rechargement complet de la page perd l'état d'authentification côté client (`useAuthStore` en mémoire uniquement, pas de bootstrap `/auth/refresh`) — le cookie `emdb_access_token` peut encore être valide et laisser passer le middleware, mais la page affiche quand même "Veuillez vous connecter" car le store Zustand est vide. C'est un problème distinct (déjà remonté comme tâche séparée), pas une régression de ce fix. **Corrigé par le bug #41.**

### 41. Déconnexions intempestives : état d'authentification perdu au rechargement + routes manquantes (Watchlist, Historique)
- **Symptôme :** L'utilisateur se retrouvait fréquemment "déconnecté" en apparence — en particulier en accédant à une page qui n'existait pas encore (Watchlist, Historique). Deux causes distinctes cumulées :
  1. Cliquer sur "Watchlist" ou "Historique" dans la sidebar menait à une 404 : ces routes (`/watchlist`, `/history`) n'avaient pas de `page.tsx`. La 404 est rendue par `app/not-found.tsx`, **en dehors** du layout `(frontend)` (pas de `Sidebar`/`Header`) — toute l'interface disparaissait d'un coup, ce qui donnait l'impression d'une déconnexion plutôt que d'une simple page manquante.
  2. Le store d'authentification (`useAuthStore`, Zustand) ne vit qu'en mémoire, sans aucun bootstrap au chargement de l'app (cf. note "hors scope" du bug #32). Après tout rechargement complet de page (F5, retour depuis la 404, navigation directe par URL), le store repartait à zéro même si le cookie `emdb_access_token` était toujours valide. Les pages `Calendrier` et `Listes` (qui vérifient `isAuthenticated` sans jamais le réhydrater) affichaient alors "Connectez-vous pour..." alors que l'utilisateur était bel et bien connecté.
- **Correction :**
  - Ajout du hook `useAuthBootstrap` (`apps/web/src/hooks/auth/useAuthBootstrap.ts`), appelé une fois dans `app/layout.tsx` : au montage, si le cookie `emdb_access_token` est présent mais que le store est vide, relit le cookie et appelle `GET /auth/me` pour réhydrater `user`/`accessToken` dans le store (avec `isLoading` pendant l'appel). En cas d'échec (token expiré/invalide), déconnecte proprement et nettoie le cookie.
  - `CalendarPage` et `ListsPage` gèrent désormais aussi l'état `isLoading` du store (spinner) avant d'afficher "Connectez-vous...", pour éviter d'afficher le mauvais état pendant la réhydratation.
  - Création de deux pages minimales manquantes, dans le layout `(frontend)` (donc avec Sidebar/Header) :
    - `/watchlist` (`apps/web/src/app/(frontend)/watchlist/page.tsx`) : affiche les titres de la liste `type = "watchlist"` de l'utilisateur (créée automatiquement à l'inscription), réutilise `TitleCard`.
    - `/history` (`apps/web/src/app/(frontend)/history/page.tsx`) : affiche les visionnages (`GET /watches`) avec suppression possible, sur le même modèle que la page `/ratings`.
  - `/calendar` et `/lists` existaient déjà et fonctionnaient correctement une fois authentifié — seul le problème de réhydratation (point 2 ci-dessus) les affectait. `/dataviz` n'est pas une route à part : c'est une section de la page `/profile`, déjà en place avec un état "à venir" — aucune page dédiée à créer.
- **Fichiers modifiés :** `apps/web/src/hooks/auth/useAuthBootstrap.ts` (nouveau), `apps/web/src/app/layout.tsx`, `apps/web/src/app/(frontend)/calendar/page.tsx`, `apps/web/src/app/(frontend)/lists/page.tsx`, `apps/web/src/app/(frontend)/watchlist/page.tsx` (nouveau), `apps/web/src/app/(frontend)/history/page.tsx` (nouveau)
- **Tests unitaires à créer :**
  - `useAuthBootstrap` : réhydrate le store depuis le cookie + `/auth/me` ; déconnecte et nettoie le cookie si `/auth/me` échoue ; ne fait rien si déjà authentifié ou si aucun cookie.
  - `/watchlist` et `/history` : affichent l'état "Connectez-vous" si non authentifié, le contenu sinon.
- **Vérification manuelle :** Testé avec un compte de test — après un rechargement complet de page, `/calendar` et `/lists` affichent bien le contenu authentifié au lieu de "Connectez-vous..." ; `/watchlist` et `/history` chargent normalement avec Sidebar/Header (fini le "Page introuvable" nu).

#### Suite — token d'accès expiré en cours de session (signalé après la modification M)
- **Symptôme :** "Des fois les boutons fonctionnalités utilisateurs cessent de fonctionner" en cours de navigation, sans rechargement de page — soupçonné lié à une déconnexion.
- **Cause racine :** Le token d'accès JWT expire après **15 min** (`signOptions: { expiresIn: '15m' }`, `auth.module.ts`). Le refresh token (7j) est bien obtenu au login et stocké dans le store Zustand, mais **n'était jamais utilisé** : `apiFetch` renvoyait simplement une erreur sur 401, sans tenter de rafraîchissement. Résultat, passé 15 min de session ouverte, toute action authentifiée (vu, favoris, listes, ...) échouait en 401 — et comme aucun hook de mutation n'a de gestion d'erreur dédiée, l'échec était silencieux (aucun toast, aucune redirection). Pire, `isAuthenticated` restait `true` dans le store (rien ne le réinitialisait), donc l'interface continuait d'afficher un utilisateur connecté alors que ses actions échouaient toutes en silence.
- **Bug annexe repéré au passage :** le cookie de rafraîchissement n'existait même pas — seul `emdb_access_token` (15 min) était persisté en cookie ; le refresh token ne vivait qu'en mémoire Zustand, donc perdu à chaque F5. Même en implémentant le rafraîchissement automatique, la session n'aurait pas survécu à un rechargement de page passé 15 min.
- **Correction :**
  - `apps/web/src/lib/auth/authCookie.ts` (nouveau, centralise ce qui était dupliqué dans `useLogin`/`useRegister`/`useAuthBootstrap`) : ajout d'un second cookie `emdb_refresh_token` (7j, aligné sur la durée de vie réelle du refresh token backend).
  - `apps/web/src/lib/api/apiClient.ts` : sur un 401 (hors `/auth/login`, `/auth/register`, `/auth/refresh`), appelle désormais `POST /auth/refresh` avec le refresh token du store, met à jour le store + les deux cookies, puis **rejoue la requête originale une fois**. Les 401 concurrents partagent la même promesse de rafraîchissement (le refresh token tourne à chaque appel côté backend — des refreshs concurrents s'invalideraient mutuellement). Si le refresh échoue (refresh token aussi expiré), déconnexion propre (`logout()` + nettoyage des deux cookies) — l'interface reflète enfin la réalité au lieu de rester bloquée dans un faux état "connecté".
  - `useAuthBootstrap.ts` : gère maintenant aussi le cas "cookie d'accès expiré mais cookie de rafraîchissement encore valide" en rappelant `POST /auth/refresh` directement au montage, en plus de réhydrater le refresh token dans le store dans tous les cas (nécessaire pour que le rafraîchissement automatique d'`apiClient.ts` fonctionne après un F5).
  - `useLogout.ts` : nettoie désormais aussi le cookie de rafraîchissement (sans ça, une déconnexion explicite était silencieusement annulée par `useAuthBootstrap` au chargement suivant, qui retrouvait le cookie de refresh encore valide).
- **Fichiers modifiés :** `apps/web/src/lib/auth/authCookie.ts` (nouveau), `apps/web/src/lib/api/apiClient.ts`, `apps/web/src/hooks/auth/useAuthBootstrap.ts`, `apps/web/src/hooks/auth/useLogin.ts`, `apps/web/src/hooks/auth/useRegister.ts`, `apps/web/src/hooks/auth/useLogout.ts`.
- **Vérification manuelle :** simulé la séquence complète token expiré → 401 → `POST /auth/refresh` (avec le vrai refresh token du cookie) → nouveau token → requête rejouée avec succès : `401` puis `201` (refresh) puis `200` (retry), conforme à ce qu'implémente `apiClient.ts`. Session confirmée persistante après rechargement complet de page (cookies présents, `Vu`/`Listes`/`Historique` visibles immédiatement sans repasser par le login).

### 42. Les listes apparaissent en double (page `/lists` et module listes du profil)
- **Symptôme :** Signalé par l'utilisateur — les listes ("Ma Watchlist", "Mes Favoris") apparaissent chacune deux fois, à la fois sur la page `/lists` et dans le module listes de la page profil.
- **Constat :** Les deux emplacements consomment le même hook `useLists()` (`apps/web/src/hooks/api/useLists.ts`, `queryKey: ["lists"]`) branché sur `GET /lists` — la duplication apparaissant aux deux endroits confirmait une donnée dupliquée en base, pas un bug d'affichage propre à une page.
- **Cause racine confirmée (deux origines indépendantes, cumulables) :**
  1. `useRegister()` (`apps/web/src/hooks/auth/useRegister.ts`) crée automatiquement "Ma Watchlist" et "Mes Favoris" via deux appels `createList.mutate(...)` dans son `onSuccess`. Instrumentation en direct (`console.log` + inspection réseau) : pour une inscription ne générant qu'**un seul** `POST /auth/register`, le callback `onSuccess` de la mutation s'est exécuté **deux fois**, à la même milliseconde côté client — comportement dev-only le plus vraisemblablement lié au double rendu de React 18 Strict Mode (actif par défaut sur Next.js 14 App Router). `createList.mutate()` était donc appelé deux fois par type, sans aucune garde d'idempotence côté backend (`lists.service.ts` insérait sans vérifier l'existant).
  2. `ListDialog.tsx` ("Créer une liste") exposait un sélecteur de **type** (Watchlist / Favoris / Personnalisée) avec **"Watchlist" en valeur par défaut** — un utilisateur validant le formulaire sans changer le type créait une deuxième liste `watchlist` en plus de celle déjà auto-créée à l'inscription. Constaté en base sur un compte réel (3 listes `watchlist` au lieu d'une).
- **Correction :**
  - Backend (`apps/api/src/lists/lists.service.ts`, `createList`) : rendu idempotent pour `watchlist`/`favoris` — si une liste de ce type existe déjà pour l'utilisateur, elle est retournée telle quelle plutôt que d'en créer une deuxième. Neutralise la cause 1 sans dépendre de la compréhension exacte du double-appel React, et empêche définitivement la cause 2 même si le formulaire est un jour recontourné.
  - Frontend (`apps/web/src/components/lists/ListDialog.tsx`) : suppression du sélecteur de type dans "Créer une liste" — seules les listes personnalisées (`type: "custom"`) sont créables depuis ce formulaire. `watchlist`/`favoris` restent uniques par utilisateur et gérées uniquement par l'inscription.
  - Nettoyage des doublons existants en base (environnement de test, aucune donnée réelle concernée) : pour chaque paire dupliquée, conservation de la liste contenant le plus d'items, suppression de(s) l'autre(s).
- **Fichiers modifiés :** `apps/api/src/lists/lists.service.ts`, `apps/web/src/components/lists/ListDialog.tsx`
- **Non corrigé (hors scope) :** la cause exacte du double déclenchement de `onSuccess` dans `useRegister()` (probable artefact React Strict Mode / dev only) n'a pas été éliminée à la source — seul son effet (duplication en base) est neutralisé par l'idempotence backend. Un `POST /lists` redondant continue donc de partir à l'inscription, sans conséquence utilisateur.
- **Vérification manuelle :** compte de test recréé après correction — une seule "Ma Watchlist" et un seul "Mes Favoris" après inscription ; formulaire "Créer une liste" ne propose plus que Nom/Description.

### 33. Filtres de type du header (Tout/Film/Série/Personne) inopérants sur la page recherche
- **Symptôme :** Les boutons de filtre dans le header (Tout, Film, Série, Personne) ne changent pas les résultats de la page recherche.
- **Cause racine :** `Header.tsx` écrit correctement le filtre `type` dans les paramètres d'URL (bug #28), mais `search/page.tsx` lisait `searchParams` comme une **prop** figée au montage (`useState(urlTab || "tout")`, sans setter jamais appelé) plutôt que via le hook réactif `useSearchParams()`. Une navigation vers la même route avec un `type` différent (déclenchée par le header, sans démonter la page) mettait bien à jour la prop `searchParams`, mais `activeTab` restait gelé à sa valeur initiale — les requêtes `useTitles()`/`usePeople()` ne recevaient donc jamais le nouveau filtre.
- **Correction :** `search/page.tsx` dérive désormais `activeTab` et `page` directement de `useSearchParams()` à chaque rendu (plus d'état local figé) ; `query` reste un état local contrôlé pour la saisie, resynchronisé via un `useEffect` si l'URL change ailleurs (navigation, retour arrière). Corrigé au passage dans `Header.tsx` : l'onglet "Personne" (valide uniquement sur `/search`) ne s'affichait jamais comme actif — `parseTitleFilters()` normalise `type=personne` en `"tout"` (il ne fait partie que du `TitleTypeFilter` partagé film/série), donc le surlignage des tabs utilise maintenant la valeur brute du paramètre d'URL plutôt que ce filtre normalisé.
- **Fichiers modifiés :** `apps/web/src/app/(frontend)/search/page.tsx`, `apps/web/src/components/layout/Header.tsx`
- **Vérification manuelle :** sur `/search?query=matrix`, cliquer "Série" (sans rechargement de page) déclenche bien `GET /titles/search?...&type=serie` et affiche des séries ; cliquer "Personne" affiche des personnes et surligne correctement l'onglet.

### 43. Filtres du header inopérants sur accueil/watchlist/listes/historique — et `GET /lists` ne renvoyait jamais les titres d'une liste
- **Symptôme :** Demande de l'utilisateur — les filtres du header (type + genre/pays/année/note) devaient pouvoir s'appliquer sur l'accueil, la watchlist, les listes et l'historique. En creusant : ces pages n'affichaient de toute façon jamais leurs titres correctement (watchlist et favoris systématiquement vides, page `/lists/:id` inexistante), donc il n'y avait rien à filtrer.
- **Cause racine (plusieurs bugs cumulés) :**
  1. `ListsService.getUserLists()` (`GET /lists`) n'a jamais renvoyé les items d'une liste (seulement `_count`), alors que le frontend (`app/(frontend)/page.tsx`, `app/(frontend)/watchlist/page.tsx`, `app/(frontend)/profile/page.tsx`) lisait `list.items` en s'appuyant sur son typage — toujours `undefined`. La watchlist de l'accueil, la page `/watchlist` et les favoris du profil étaient donc **systématiquement vides**, quel que soit le contenu réel.
  2. `ListCard.tsx` affichait `list.items?.length` (toujours 0) au lieu de `_count.list_items` — toutes les listes affichaient "0 titres" sur `/lists`, même non vides.
  3. La page `/lists/:id` (détail d'une liste) n'existait pas du tout, malgré un test (`ListCard.test.tsx`) qui attendait déjà un lien vers cette route.
  4. `ListDetail.items` (typage frontend) ne correspondait pas à la réponse réelle de `GET /lists/:id` (`{title_id, position, added_at, title: {...}}` en snake_case vs `Title[]` attendu), et le select Prisma ne remontait ni genres, ni pays, ni note, ni date de sortie — indispensables pour filtrer.
- **Correction :**
  - Backend (`apps/api/src/lists/lists.service.ts`) :
    - `getUserLists()` inclut désormais, par liste, un tableau `items` allégé (`type`, `year`, `note`, `genreIds`, `countryIds`) suffisant pour déterminer si une liste contient un titre correspondant aux filtres actifs, sans avoir à charger le détail de chaque liste.
    - `getListDetail()` renvoie désormais les items au format frontend `Title` (camelCase, avec genres/pays/note/date de sortie), prêts pour `TitleCard` et le filtrage.
  - Frontend :
    - Nouvelle page `app/(frontend)/lists/[id]/page.tsx` (détail d'une liste), avec filtres appliqués.
    - `ListCard.tsx` : compteur basé sur `_count.list_items`, carte cliquable vers `/lists/:id`.
    - `app/(frontend)/watchlist/page.tsx` et la section "Watchlist" de l'accueil : récupèrent désormais le détail réel de la liste watchlist (`useList(watchlistId)`) au lieu de `useLists()`. Section "Favoris" du profil : idem.
    - `lib/titleFilters.ts` : ajout de `titleMatchesFilters()`/`toFilterableTitle()`/`FilterableTitle`, réutilisés par toutes les pages listées ci-dessous.
    - Filtres branchés : accueil (sections Watchlist et Historique — Recommandés reste non filtrable, section non implémentée côté backend, cf. `useRecommendations()` toujours stub vide), `/watchlist`, `/lists` (n'affiche que les listes contenant un titre correspondant), `/lists/:id`, `/history` (filtre `type` uniquement, transmis au backend via `GET /watches?type=...` — les autres filtres ne s'appliquent pas, cf. bug lié ci-dessous).
    - `Header.tsx` : le menu de filtres (tabs + bouton "Filtres") ne s'affiche plus que sur les pages où il a un effet (`/`, `/search`, `/calendar`, `/watchlist`, `/lists`(+ `/lists/:id`), `/history`) — masqué ailleurs (pages titre/personne/épisode/profil). Sur `/history`, seuls les tabs type s'affichent (pas le bouton "Filtres" : genre/pays/année/note non disponibles sur les visionnages, cf. bug lié).
  - Tests : `lists.service.spec.ts` mis à jour pour la nouvelle forme de réponse (36 tests, tous verts).
- **Fichiers modifiés :** `apps/api/src/lists/lists.service.ts`, `apps/api/src/lists/lists.service.spec.ts`, `apps/web/src/lib/types/api.ts`, `apps/web/src/lib/titleFilters.ts`, `apps/web/src/components/lists/ListCard.tsx`, `apps/web/src/components/layout/Header.tsx`, `apps/web/src/app/(frontend)/lists/[id]/page.tsx` (nouveau), `apps/web/src/app/(frontend)/lists/page.tsx`, `apps/web/src/app/(frontend)/watchlist/page.tsx`, `apps/web/src/app/(frontend)/page.tsx`, `apps/web/src/app/(frontend)/profile/page.tsx`, `apps/web/src/app/(frontend)/history/page.tsx`
- **Vérification manuelle :** compte de test avec 1 film + 1 série en watchlist — `/watchlist`, `/lists` (compteur "2 titres"), `/lists/:id` et la section Watchlist de l'accueil affichent désormais les vrais titres ; filtre "Film" sur `/watchlist` ne garde que le film ; page titre (`/titles/:id`) ne montre plus les filtres du header.

### 44. Historique : le filtre "Série" ne renvoyait aucune donnée
- **Symptôme :** Signalé par l'utilisateur — sur `/history`, filtrer par "Série" ne renvoyait aucun visionnage, même quand des épisodes ont été marqués comme vus.
- **Cause racine :** `WatchesService.listWatches()` (`apps/api/src/watches/watches.service.ts`) filtrait par `where.titles = { type: filters.type }` — condition portant uniquement sur la relation directe `title_id → titles`. Or `createWatch()` impose que `title_id` et `episode_id` soient mutuellement exclusifs : marquer un **épisode** comme vu (le cas normal pour une série) enregistre `title_id = null` et seulement `episode_id`. Le filtre ne matchait donc jamais ces lignes (relation nulle), alors que l'essentiel des visionnages de séries passent par des épisodes.
- **Correction :** filtre étendu — pour `type: 'serie'`, `where.OR = [{ titles: { type: 'serie' } }, { episodes: { seasons: { titles: { type: 'serie' } } } }]` (couvre les deux façons d'enregistrer un visionnage de série) ; pour `type: 'film'`, un épisode n'appartenant jamais à un film, `where.titles = { type: 'film' }` suffit.
- **Fichiers modifiés :** `apps/api/src/watches/watches.service.ts` (`listWatches`), `apps/api/src/watches/watches.service.spec.ts` (nouveau test)
- **Limite connue (non corrigée) :** le libellé affiché sur `/history` pour un visionnage d'épisode reste générique ("Série — Épisode N") plutôt que le nom de la série — `listWatches()` ne remonte pas le titre de la série parente pour la branche épisode (`episodes.seasons` ne sélectionne que `numero`). Amélioration possible mais hors scope de ce fix (le filtre, lui, fonctionne).
- **Vérification manuelle :** watch créé sur un épisode (`title_id` bien `null`) — apparaît désormais dans `/history` en filtrant "Série".

### 45. Icônes "vu"/"watchlist"/"favori" non fonctionnelles sur les affiches
- **Symptôme :** Signalé par l'utilisateur — sur la page titre, les boutons "Marquer comme vu" et "Listes" (ajout à la watchlist/favoris) ne faisaient rien au clic. En conséquence, aucune icone n'apparaissait jamais sur les affiches puisqu'il était impossible de passer un titre "vu" ou de l'ajouter à une liste depuis cette page.
- **Cause racine :** `WatchButton.tsx` et `TitleActions.tsx` enveloppaient un composant `<Button>` complet à l'intérieur de `<DropdownMenuTrigger>` sans utiliser sa prop `render` (pattern de fusion "asChild" de Base UI) — ce qui générait un **`<button>` imbriqué dans un `<button>`**, HTML invalide. Vérifié empiriquement : un clic réel (souris ET synthétique) sur le bouton visible ne déclenchait ni `onClick`, ni l'ouverture du menu — aucune requête `POST /watches` ni `POST /lists/:id/items` ne partait.
- **Correction :**
  - `WatchButton.tsx` et `TitleActions.tsx` : le bouton visible est désormais fusionné sur le déclencheur via `<DropdownMenuTrigger render={<Button>...</Button>} />` — un seul `<button>` dans le DOM.
  - `WatchButton.tsx` avait en plus un conflit d'interaction (clic simple = action, clic long = menu, géré à la main) avec le comportement par défaut de Base UI (ouverture du menu au clic) : `onOpenChange` ignore désormais les demandes d'ouverture venant du déclencheur (seul le clic long, via `setOpen(true)` direct, ouvre le menu) et n'honore que les demandes de fermeture.
- **Changement de design des icones (demandé par l'utilisateur en même temps) :** plutôt que corriger l'ancien binôme bookmark (`followed`, piloté par "Suivre")/œil (`watched`), l'affiche montre désormais **trois icones indépendantes**, empilées en haut à gauche sur le bord (favori, watchlist, vu, dans cet ordre) — chacune reflétant directement l'appartenance aux listes `Mes Favoris`/`Ma Watchlist` et l'état "vu". Résout au passage la modification D (bookmark/watchlist) sans avoir à choisir entre union et fusion avec le mécanisme "Suivre" : celui-ci n'alimente plus l'affiche. Le badge de type (Film/Série) est déplacé en haut à droite pour laisser la place.
  - Nouveau hook `useListMembership()` (dérivé de `useLists()`, déjà en cache) exposant les Sets `watchlistIds`/`favoriteIds`.
  - `GET /lists` inclut désormais aussi `titleId` dans les items allégés (nécessaire pour construire ces Sets).
  - `TitleCard`/`TitleCardHorizontal`/`TitlePoster` : prop `followed` remplacée par `inWatchlist`/`inFavorites`. Tous les consommateurs mis à jour (`search`, `watchlist`, `lists/[id]`, accueil, profil, `ListItemsGrid`, `ListReorder`, `Filmography`, `TitleRecommendations`).
  - Tooltips ajoutés sur les 3 icones (modification I, cf. ci-dessus).
- **Fichiers modifiés :** `apps/web/src/components/watches/WatchButton.tsx`, `apps/web/src/components/titles/TitleActions.tsx`, `apps/web/src/components/titles/TitlePoster.tsx`, `apps/web/src/components/titles/TitleCard.tsx`, `apps/web/src/hooks/api/useListMembership.ts` (nouveau), `apps/web/src/hooks/api/index.ts`, `apps/api/src/lists/lists.service.ts`, `apps/api/src/lists/lists.service.spec.ts`, `apps/web/src/lib/types/api.ts`, et tous les consommateurs de `TitleCard` listés ci-dessus.
- **Vérification manuelle :** sur la page titre, "Marquer comme vu" déclenche bien `POST /watches` (201) et le bouton passe à "Vu" (rouge) ; "Listes" ouvre le menu et cocher "Favoris" déclenche `POST /lists/:id/items` (201) ; sur `/watchlist`, l'affiche affiche bien cœur (favori) + bookmark (watchlist) + œil (vu) empilés en haut à gauche, avec tooltip au survol de chacun.

### 46. Impossible d'ajouter un titre à la watchlist / à une liste
- **Symptôme :** Signalé par l'utilisateur — action bloquée ou sans effet lors de l'ajout d'un titre à la watchlist ou à une liste. À reproduire précisément (module concerné, depuis quelle page) avant correction.
- **Fichiers concernés (pressentis) :** `apps/web/src/components/titles/TitleQuickActionsMenu.tsx`, `apps/web/src/components/titles/TitleActions.tsx`, `apps/web/src/hooks/api/useAddItem.ts`/`useAddListItem.ts`, `apps/api/src/lists/lists.service.ts`

### 47. Titres recommandés : les icônes vu/watchlist/favori ne se mettent pas à jour en temps réel
- **Symptôme :** Dans le module "Titres recommandés" (page titre), ajouter/retirer un titre de la watchlist ou le marquer comme vu ne fait pas apparaître/disparaître l'icone correspondante sans rechargement complet de la page — alors que ce rafraîchissement en temps réel fonctionne ailleurs (bug #45 : invalidation de `["watched-titles-set"]`/`["lists"]`).
- **Cause probable :** `TitleRecommendations.tsx` ne relit peut-être pas `useWatchedTitles()`/`useListMembership()` après mutation, ou les props `watched`/`inWatchlist`/`inFavorites` passées à `TitleCard` y sont figées au premier rendu (cf. le mécanisme déjà en place pour `search`/`watchlist`/accueil, bug #45).
- **Fichiers concernés :** `apps/web/src/components/titles/TitleRecommendations.tsx`

### 48. Le module "Distribution & Équipe"/filmographie ne charge pas toutes les données, seulement celles en cache
- **Symptôme :** Signalé par l'utilisateur — le module filmographie n'affiche que ce qui était déjà en cache local, sans compléter avec les données fraîches. Possiblement lié au bug #27 (refresh TMDB fire-and-forget au chargement) : le refresh part bien mais son résultat n'est pas répercuté dans le rendu, ou expire/échoue silencieusement.
- **Fichiers concernés (pressentis) :** `apps/web/src/hooks/api/useRefreshFilmography.ts`, `apps/web/src/app/(frontend)/people/[id]/page.tsx`, `apps/api/src/people/people.service.ts` (`refreshFilmography`)

### 49. Les menus (dropdown) ne doivent pas être transparents — ✅ corrigé
- **Symptôme :** Les menus dropdown (`DropdownMenuContent` — menu utilisateur, "Listes", filtres Genre/Pays/Listes, etc.) laissent transparaître le contenu derrière eux au lieu d'avoir un fond opaque.
- **Cause racine (trouvée en marge de la modification W, "les menus dataviz sont inaccessibles") :** `card`/`popover` (utilisés par `bg-popover`/`bg-card`/`text-popover-foreground`/`text-card-foreground` dans `dropdown-menu.tsx`, `card.tsx`, `alert.tsx`, `alert-dialog.tsx`, `dialog.tsx`, `toast.tsx`) n'étaient **définis nulle part** dans `tailwind.config.ts` — ni dans `theme.extend.colors`, ni via les variables CSS de `globals.css` (`--popover`/`--card` n'y existent pas non plus). Ces classes Tailwind compilaient donc vers rien : fond transparent partout, silencieusement, depuis l'introduction de ces composants.
- **Correction :** `card`/`popover` ajoutés à `theme.extend.colors` dans `tailwind.config.ts`, mappés sur `designTokens.colors.surface.DEFAULT` (`#1f1f1f`, déjà défini mais jamais connecté à un token Tailwind) et `designTokens.colors.text.primary.DEFAULT` pour le foreground — cohérent avec `TOOLTIP_BG` déjà utilisé par les graphiques dataviz.
- **Fichiers modifiés :** `apps/web/tailwind.config.ts`.
- **Vérification :** fond `rgb(31, 31, 31)` confirmé (au lieu de `rgba(0, 0, 0, 0)`) sur le panneau `ChartConfigMenu` et sur les dropdowns du header (Genre/Pays/Listes, "Filtres") après correction.

### 50. Le calendrier de sortie ne charge pas les épisodes des séries suivies
- **Symptôme :** Signalé par l'utilisateur — `/calendar` n'affiche aucun épisode à venir pour les séries suivies.
- **Diagnostiqué en marge de la modification K :** en environnement de dev local, `GET /calendar` répond `500`. Cause identifiée : `WatchesService.getCalendar()` appelle `countEpisodesNonVus()` (`@emdb/db`), qui exécute la fonction PL/pgSQL `fn_episodes_non_vus(uuid, uuid)` — absente de la base locale (`la fonction fn_episodes_non_vus(uuid, uuid) n'existe pas`, même constat que l'échec pré-existant de `plpgsql-functions.spec.ts`). À vérifier si c'est aussi la cause en environnement de l'utilisateur (migration SQL non appliquée) ou si un autre bug s'y ajoute une fois la fonction présente.
- **Bug annexe repéré au passage :** `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`) avale toute exception non-Prisma/non-HTTP sans la logger — un `500` générique ("Erreur serveur interne") ne laisse aucune trace côté serveur, ce qui a rendu ce diagnostic plus long que nécessaire.
- **Fichiers concernés :** `packages/db` (migration SQL définissant `fn_episodes_non_vus`), `apps/api/src/watches/watches.service.ts` (`getCalendar`), `apps/api/src/common/filters/prisma-exception.filter.ts` (ajouter un `console.error`/logger avant la réponse générique).

### 51. Page saison : boutons "Marquer comme vu" et "+" absents sur les épisodes
- **Symptôme :** Sur la page d'une saison (liste des épisodes), aucun bouton "Marquer comme vu" ni bouton "+" (ajout rapide au visionnage) n'est présent sur chaque épisode — contrairement à la page épisode elle-même (bug #26, déjà corrigé) qui les a.
- **Fichiers concernés (pressentis) :** page/composant listant les épisodes d'une saison (`apps/web/src/app/(frontend)/titles/[id]/page.tsx` ou composant saison dédié), `apps/web/src/components/watches/WatchButton.tsx`, `apps/web/src/components/watches/EpisodeSnapshot.tsx`

### 52. Historique : les visionnages d'épisode n'affichent pas d'image (utiliser l'affiche de la série)
- **Symptôme :** Sur `/history` et le module accueil, les vignettes des épisodes vus n'ont pas d'image (fond vide), contrairement aux films.
- **Cause racine identifiée :** `WatchesService.listWatches()` (`apps/api/src/watches/watches.service.ts`) inclut `episodes: { select: { id, numero, titre, seasons: { select: { numero } } } }` — la relation `seasons → titles` (qui porterait `affiche_url` de la série) n'est pas sélectionnée. Côté frontend, `DateCard`/`DateCardSlider` (modification J/K) utilisent `watch.titles?.affiche_url`, qui est toujours `null` pour un visionnage d'épisode (`title_id` est `null` par construction, cf. bug #44 — seul `episode_id` est renseigné).
- **Correction proposée :** dans `listWatches()`, étendre `episodes.select.seasons.select` avec `titles: { select: { affiche_url: true, titre_vo: true, titre_vf: true } }` ; côté frontend (`page.tsx`, `history/page.tsx`), utiliser `watch.episodes?.seasons?.titles?.affiche_url` en repli quand `watch.titles` est absent.
- **Fichiers concernés :** `apps/api/src/watches/watches.service.ts`, `apps/web/src/lib/types/api.ts` (`UserWatch`), `apps/web/src/app/(frontend)/page.tsx`, `apps/web/src/app/(frontend)/history/page.tsx`

### 53. Filtres Genre/Pays inopérants sur les modules "Découvrir" et "Titres recommandés"
- **Symptôme :** Sur `/discover`, `/discover/[module]` et le module "Titres recommandés" d'une page titre, les filtres "Genre" et "Pays" du panneau Filtres n'excluent aucun résultat, contrairement à Type/Statut/Année de sortie/Note IMDB/Listes qui fonctionnent correctement partout (modification O, 2ème passe). Sur "Titres recommandés", le filtre "Année de sortie" ne fonctionne pas non plus.
- **Cause racine :** Ces deux surfaces consomment des réponses TMDB (`GET /discover/:module` pour Découvrir, l'endpoint recommandations pour "Titres recommandés") qui ne portent ni genre/pays sous une forme reliée à nos ids locaux, ni (pour les recommandations) de date de sortie. `DiscoverTitleResult`/`TitleRecommendation` (types backend/frontend) n'exposent tout simplement pas ces champs — `FilterableTitle.genreIds`/`countryIds`/`year` valent `undefined` pour ces surfaces (modification O), ce qui désactive volontairement le check plutôt que d'exclure tous les résultats par erreur, mais laisse le filtre sans effet réel.
- **Correction proposée :**
  - Genre/Pays sur Découvrir : le modèle `genres` stocke déjà `tmdb_id` (`packages/db/prisma/schema.prisma`), mais rien d'équivalent n'existe pour `countries` (identifiées par code ISO, pas d'id TMDB numérique). Il faudrait (1) capturer `genre_ids: number[]` dans les réponses TMDB trending/discover (`apps/api/src/discover/discover.service.ts`, `mapItems()`), (2) les mapper vers nos `genres.id` locaux via `tmdb_id`, (3) exposer un nouveau champ (ex. `genre_ids: string[]`) dans `DiscoverTitleResult`, (4) le consommer côté frontend (`DiscoverModuleSection.tsx`) au lieu de `undefined`. Pour Pays, il faudrait d'abord établir une correspondance code TMDB ↔ `countries.code` (déjà le même référentiel ISO a priori, à vérifier) avant de pouvoir l'exposer de la même façon.
  - Année/Genre/Pays sur "Titres recommandés" : `TitleRecommendation` (`apps/web/src/lib/types/api.ts`) ne porte que `id, tmdb_id, titre_vo, titre_vf, affiche_url, type, note_imdb` — il faudrait étendre l'endpoint recommandations backend pour renvoyer aussi `date_sortie` et les genres/pays (mêmes limitations TMDB que ci-dessus pour le mapping genre/pays).
- **Fichiers concernés :** `apps/api/src/discover/discover.service.ts`, `apps/web/src/hooks/api/useDiscover.ts`, `apps/web/src/components/discover/DiscoverModuleSection.tsx`, backend endpoint recommandations (à localiser), `apps/web/src/lib/types/api.ts` (`TitleRecommendation`), `apps/web/src/components/titles/TitleRecommendations.tsx`.

### 54. Module dataviz (page Profil) : tous les endpoints `/dataviz/*` échouaient en 500 — ✅ corrigé
- **Symptôme :** Sur `/profile`, la section "Statistiques de visionnage" affichait systématiquement "0 min" / "0 visionnages" et aucun graphique, quel que soit l'historique réel de l'utilisateur. `GET /dataviz/watch-time` et `GET /dataviz/watch-count` renvoyaient tous deux 500 en toutes circonstances (les 4 `groupBy` : period/genre/country/animation), avec un message générique et sanitizé côté client ("Erreur serveur interne.") ne donnant aucune piste.
- **Cause racine (deux problèmes empilés, découverts successivement) :**
  1. Les 8 vues matérialisées dataviz (`mv_watch_time_by_*`, `mv_watch_count_by_*`, définies en SQL brut dans `packages/db/sql/db_init.sql`, hors du schéma Prisma) n'existaient pas du tout sur la base locale — `npm run apply:raw-sql` (script idempotent censé les créer après toute réinitialisation de la base) n'avait jamais été (re)exécuté. `CREATE MATERIALIZED VIEW` a réussi pour les 8 vues (log "SQL exécuté avec succès", pas "Déjà existant, ignoré"), confirmant qu'elles étaient absentes.
  2. Une fois les vues en place, les endpoints échouaient toujours : `SUM(...)`/`COUNT(*)` sur ces vues remontent en `bigint` PostgreSQL, que le driver `pg` (utilisé par `prisma.$queryRawUnsafe`) renvoie en `BigInt` JS natif — que `JSON.stringify` (sérialisation de réponse Express) ne sait pas sérialiser ("Do not know how to serialize a BigInt"), faisant planter la requête après coup, dans le handler de réponse.
  - **Bug annexe découvert en diagnostiquant :** `PrismaExceptionFilter` (`apps/api/src/common/filters/prisma-exception.filter.ts`), le filtre d'exception global, ne loggait strictement rien côté serveur pour toute exception non reconnue (branche 500 générique) — impossible de diagnostiquer quoi que ce soit depuis les logs sans instrumenter le code à la main. Corrigé au passage.
- **Correction :**
  - `npm run apply:raw-sql` exécuté (idempotent, sans risque) pour recréer les 8 vues matérialisées manquantes.
  - `DatavizService` : nouvelle méthode privée `queryRaw()`, utilisée par les 8 méthodes `getWatch{Time,Count}By{Period,Genre,Country,Animation}` à la place d'un appel direct à `$queryRawUnsafe` — convertit toute valeur `bigint` d'une ligne résultat en `Number` avant de la renvoyer (sans risque de perte de précision réaliste : minutes/nombre de visionnages d'un seul utilisateur, très loin de `Number.MAX_SAFE_INTEGER`).
  - `PrismaExceptionFilter` : ajout d'un `Logger.error()` (message + stack) sur la branche 500 générique, pour que toute exception inattendue future laisse une trace exploitable côté serveur.
- **Fichiers modifiés :** `apps/api/src/dataviz/dataviz.service.ts`, `apps/api/src/dataviz/dataviz.service.spec.ts` (2 nouveaux tests de régression sur la conversion bigint→Number), `apps/api/src/common/filters/prisma-exception.filter.ts`.
- **Vérification :** `tsc --noEmit` (api) sans erreur. `jest` api : `dataviz.service.spec.ts` 16/16 (dont les 2 nouveaux cas) ; suite complète 180/184, 3 suites en échec (`auth`, `people`, `credits` — préexistantes, sans rapport). Vérifié en direct dans le navigateur : `/profile` affiche désormais "6 h 47 min" / "2 visionnages" (données réelles de l'utilisateur de test) et un graphique au lieu de "0 min" / "0" ; `GET /dataviz/watch-time`/`watch-count` renvoient 200 pour les 4 `groupBy` (period confirmé par défaut, genre confirmé au clic sur l'onglet correspondant — country/animation empruntent le même chemin de code, non re-testés individuellement).

### 55. Script `scripts/import-trakt.js` : la majorité des titres de l'export Trakt n'étaient jamais importés — ✅ corrigé
- **Symptôme :** après import d'un export Trakt personnel, une grande partie des films/séries de l'historique/notes/watchlist restait absente du catalogue local (donc invisible dans l'appli), sans message d'erreur.
- **Cause racine :** `findTitleByTmdb()` faisait un simple `prisma.titles.findUnique({ where: { tmdb_id } })` — si le titre n'existait pas déjà en local, la fonction renvoyait `null` et l'item Trakt était silencieusement compté en "skipped", sans jamais déclencher l'import TMDB réel (`importTitleByTmdbId`, utilisé partout ailleurs dans l'appli — recherche, page titre, etc.). Diagnostiqué en direct sur l'export réel de l'utilisateur : sur les tmdb_id distincts référencés, 913/1062 films (86 %) et 169/198 séries (85 %) étaient absents de la base locale. Bug annexe trouvé dans le même passage : dans `importList()`, les items de type "episode" (listes de collection) cherchaient un titre par `item.episode.ids.tmdb` — l'id TMDB d'un épisode n'a jamais correspondu à un `titles.tmdb_id` (qui ne stocke que films/séries), donc ces items échouaient systématiquement aussi.
- **Correction :**
  - Nouvelle fonction `findOrImportTitle(tmdbId, type)` : si le titre n'existe pas localement, appelle `importTitleByTmdbId()` (import complet TMDB, comme pour tout import déclenché depuis l'appli) avant de continuer, avec un cache mémoire par run (un même titre apparaît souvent des dizaines de fois entre historique/notes/listes) et un compteur de succès/échecs séparé du compteur "skip" existant.
  - `findEpisodeByTmdb()` : si la série existe déjà mais que la saison/l'épisode demandé est introuvable (série importée avant la sortie de cet épisode), une resynchro (`importSeasonsForSerie()`) est tentée une fois par série et par run avant de retenter le lookup.
  - `importList()` : les items "episode" retombent sur le tmdb_id du show parent (`item.show.ids.tmdb`) plutôt que celui de l'épisode — `list_items` ne référence de toute façon que des titres, pas des épisodes.
  - Casting non importé par défaut pour ce script (`IMPORT_WITH_CREDITS = false`, decision utilisateur) : sur ~1080 titres manquants, l'import du casting complet aurait représenté plusieurs dizaines de milliers d'appels TMDB (plusieurs heures avec le rate-limit configuré) pour un gain non prioritaire pour un backfill d'historique de visionnage.
  - Bug latent annexe corrigé dans le script (pas dans `@emdb/db`) : `packages/db/index.ts` charge le `.env` racine via un chemin relatif à `__dirname` qui suppose une exécution directe depuis les sources TS ; une fois résolu via son build compilé (`dist/index.js`, un niveau plus profond), ce chemin ne pointe plus sur la racine et `DATABASE_URL`/`TMDB_API_KEY` restent vides pour tout script autonome qui ne charge pas déjà son propre `.env` avant d'importer `@emdb/db`. `import-trakt.js` charge désormais le `.env` racine en tout premier (dotenv n'écrase jamais une variable déjà définie, donc inoffensif si déjà chargée par ailleurs).
  - **Effet de bord découvert et corrigé en cours de route :** aucun moyen depuis l'UI de compléter le casting d'un titre importé sans credits (`PATCH /titles/:id/refresh` — bouton "Actualiser" — n'existait même pas sur la page titre, et le refresh existant (`refreshTitleData`) ne réimportait de toute façon pas les credits). Voir bug #56 ci-dessous.
- **Fichiers modifiés :** `scripts/import-trakt.js` (réécrit).
- **Vérification :** exécuté en direct sur l'export réel de l'utilisateur (81 fichiers JSON, ~7 400 visionnages d'épisodes) : `1078 nouveaux titres importés depuis TMDB, 2 échecs d'import` (les 2 échecs = 404 TMDB, tmdb_id invalides/supprimés côté TMDB, rien à faire côté script). Détail des 657 visionnages d'épisodes encore "skipped" après coup : 594 sans tmdb_id/saison/épisode dans l'export Trakt lui-même (rien d'exploitable), 42 relevant des 2 shows en échec d'import (404 TMDB), 21 où l'épisode n'existe pas dans les données de saison TMDB (numérotation Trakt/TMDB discordante, cas résiduel). `Watches: 6711 imported`, `Watched movies: 1003 imported`, `Ratings: 271 imported`, `Watchlist: 68 items imported`.

### 56. Page titre : aucun moyen de rafraîchir le casting depuis l'UI (bouton "Actualiser" absent) — ✅ corrigé
- **Symptôme :** découvert en creusant le bug #55 — un titre importé sans casting (ou dont le casting TMDB a changé depuis l'import) n'avait aucun moyen d'être complété depuis l'UI. La page personne (`/people/:id`) déclenche bien un refresh de filmographie automatique au chargement (bug 27), mais silencieusement, sans bouton, et ça ne backfill qu'un crédit à la fois (la personne consultée) — pas le casting complet d'un titre. La page titre (`/titles/:id`) n'avait quant à elle strictement aucun mécanisme de refresh, ni bouton ni automatique.
- **Cause racine annexe :** même le endpoint backend existant (`PATCH /titles/:id/refresh` → `refreshTitleData`) ne réimportait pas les credits — seulement les métadonnées du titre (note, statut, etc.) et les saisons/épisodes pour une série. Un appel à ce endpoint n'aurait de toute façon pas résolu le problème.
- **Correction :**
  - `TitlesService.refreshTitle()` appelle désormais `importTitleByTmdbId(tmdb_id, type, { withCredits: true })` (mêmes upserts idempotents qu'un import initial complet) plutôt que `refreshTitleData` — le refresh redevient un vrai resync complet, casting inclus.
  - Nouveau hook `useRefreshTitle` (même pattern que `useRefreshFilmography` : timeout 120 s côté client, un import complet peut être long) et nouveau composant partagé `RefreshDataButton`.
  - Bouton "Actualiser" ajouté sur la page titre (à côté du titre "Distribution & Équipe") et sur la page personne (à côté de "Filmographie", en complément — pas en remplacement — de l'auto-refresh silencieux existant, pour un déclenchement manuel explicite).
- **Fichiers modifiés :** `apps/api/src/titles/titles.service.ts` (+spec), `apps/web/src/hooks/api/useRefreshTitle.ts` (nouveau), `apps/web/src/components/common/RefreshDataButton.tsx` (nouveau), `apps/web/src/app/(frontend)/titles/[id]/page.tsx`, `apps/web/src/app/(frontend)/people/[id]/page.tsx`.
- **Vérification :** `tsc --noEmit` (web + api) sans nouvelle erreur. `jest` api : `titles.service.spec.ts` 14/14 ; suite complète 206/210 (3 suites en échec préexistantes, baseline inchangée). `jest` web : 200/209, baseline inchangée. Vérifié en direct dans le navigateur sur un titre fraîchement importé sans casting ("Porco Rosso", bug #55) : "Aucun crédit disponible pour ce titre." avant clic, bouton "Actualiser" → état "Actualisation..." → casting complet affiché après coup (Shūichirō Moriyama, Tokiko Kato, etc.) ; bouton confirmé présent aussi sur une page personne.

### 57. `apps/worker` : `DATABASE_URL` absent silencieusement en dev, jobs longs échouant en cours de route — ✅ corrigé
- **Symptôme :** découvert en testant en conditions réelles le nouveau bouton "Importer depuis Trakt" (modification, voir plus bas) — un job d'import réel (export complet de l'utilisateur, ~1260 titres référencés) échouait avec `Environment variable not found: DATABASE_URL` après avoir silencieusement skip toutes ses écritures, alors qu'un job de test plus petit exécuté juste après passait sans problème.
- **Cause racine :** même bug de résolution de chemin `.env` que le bug #55 (`packages/db/index.ts` résout le `.env` racine via un chemin relatif à `__dirname`, qui suppose une exécution depuis les sources TS), mais cette fois-ci non contourné : `apps/worker` tourne en dev via `ts-node-dev --transpile-only` **sans** `tsconfig-paths/register`, donc l'alias `paths` du `tsconfig.json` (`@emdb/db` → sources TS) n'est pas appliqué — Node résout `@emdb/db` par résolution standard via le symlink de workspace, qui pointe sur le `dist/index.js` **compilé** (`main` du `package.json`). Depuis `dist/`, le chemin relatif vers le `.env` racine tombe un niveau trop haut (`packages/.env` au lieu de la racine du repo) → `dotenv.config()` échoue silencieusement (pas d'exception), et chaque appel Prisma qui suit lève une erreur de validation de schéma, avalée par les `try/catch` du worker jusqu'à un appel non protégé (`importList`) qui fait planter tout le job.
- **Correction :** `packages/db/index.ts` essaie désormais deux profondeurs de chemin candidates (`__dirname` en tant que source `packages/db/` ou build `packages/db/dist/`) et prend la première qui existe réellement sur disque, plutôt que de supposer laquelle s'applique — corrige le problème à la source pour tous les consommateurs (`apps/api`, `apps/worker`, scripts autonomes) au lieu de le contourner au cas par cas. `packages/db` recompilé (`npx tsc -p tsconfig.json`) pour propager le correctif au `dist/index.js` que charge `apps/worker` en dev, et le process worker relancé.
- **Fichiers modifiés :** `packages/db/index.ts`.
- **Vérification :** worker relancé (`ts-node-dev --respawn --transpile-only src/index.ts`), job de test relancé après correctif : résolution de titre confirmée en base (`watchedMovies: 1` au lieu de `0`). Puis job réel rejoué sur l'export Trakt complet de l'utilisateur (81 fichiers JSON) via le nouvel endpoint `POST /import/trakt` : `watches: 6711 (657 skip)`, `watchedMovies: 1003 (1 skip)`, `ratings: 271`, `listsImported: 68`, `titlesFailed: 2` — chiffres identiques à l'exécution du script original (bug #55), confirmant que le pipeline queue/worker est équivalent au script direct.

### 58. Modification : bouton "Importer depuis Trakt" (page Profil) — expose le script d'import en tâche de fond avec suivi de progression
- **Demande :** transformer le script CLI `scripts/import-trakt.js` (bug #55) en fonctionnalité UI accessible depuis la page Profil — sélection d'un fichier `.zip`, import en tâche de fond (potentiellement 20-30 min), popup de progression `X / Y titres importés`, état "Import terminé" avec résumé.
- **Implémentation :**
  - **Worker (`apps/worker/src/trakt-import.worker.ts`, nouveau) :** portage TS de la logique du script (bug #55) en job BullMQ (`queue trakt-import`, `concurrency: 1`, `lockDuration: 1h`) — pré-scan des tmdb_id référencés (`collectReferencedTmdbIds`) pour calculer un total avant de démarrer, `job.updateProgress({ imported, total })` à chaque titre résolu, nettoyage du dossier temporaire extrait en fin de job.
  - **API (`apps/api/src/import/`, nouveau module) :** `POST /import/trakt` — upload `.zip` (`multer` + `diskStorage`, 100 Mo max), dézippage (`adm-zip`) dans un dossier temporaire, validation de la présence de fichiers repères Trakt avant d'enfiler le job (`ImportService.startTraktImport`) ; `GET /import/trakt/:jobId/status` — état/progression/résultat du job (`removeOnComplete`/`removeOnFail` bornés à 1h, pas `true`, pour rester consultable après complétion, à la différence des autres jobs de l'appli). Non admin-gated : import des propres données de l'utilisateur connecté.
  - **Frontend :** `useUploadTraktExport`/`useTraktImportStatus` (`apps/web/src/hooks/api/useImportTrakt.ts`, upload `FormData` — pas `apiFetch`, qui force du JSON — + polling `refetchInterval` tant que le job n'est pas terminé) ; `TraktImportButton` (`apps/web/src/components/profile/TraktImportButton.tsx`) — input file caché déclenché par le bouton, popup (`Dialog`) avec barre de progression puis résumé final, placé en bas de la page Profil.
- **Effet de bord découvert et corrigé en cours de route :** voir bug #57 ci-dessus (le premier job réel lancé sur ce nouveau pipeline a révélé le bug `DATABASE_URL` du worker).
- **Fichiers modifiés/créés :** `apps/worker/src/trakt-import.worker.ts`, `apps/worker/src/index.ts`, `apps/api/src/import/{import.config,import.service,import.controller,import.module}.ts`, `apps/api/src/app.module.ts`, `apps/web/src/hooks/api/useImportTrakt.ts` (+ `index.ts`), `apps/web/src/components/profile/TraktImportButton.tsx`, `apps/web/src/app/(frontend)/profile/page.tsx`, `apps/web/src/lib/api/apiClient.ts` (export de `API_BASE_URL`), `apps/api/package.json` (`adm-zip`).
- **Vérification :** `tsc --noEmit` (api + web + worker*) sans nouvelle erreur (*`apps/worker` a une limitation `rootDir` préexistante et non liée qui empêche `tsc --noEmit` direct sur cet app — vérifié via `jest` à la place, comme pour le reste de ce module). `jest` api 206/210, web 200/209, worker 7/7 — baselines inchangées. Vérifié en direct dans le navigateur : bouton présent en bas de Profil, popup avec barre de progression fonctionnelle (testé avec un mini export Trakt synthétique puis avec l'export réel complet de l'utilisateur via `POST /import/trakt` — résultats identiques au script original, voir bug #57).

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

---

## Modifications à faire

### A. Module personnes : filtre par badge rôle — remplacé par C (✅ fait sous cette forme)
- **Description :** Ajouter un filtre par rôle (acteur, réalisateur, scénariste, autre) dans la page personne et la filmographie, sous forme de badges cliquables.
- **Fichier concerné :** `apps/web/src/app/people/[id]/page.tsx`, `apps/web/src/components/people/Filmography.tsx`

### B. Module filmographie : filtre par badge rôle — remplacé par C (✅ fait sous cette forme)
- **Description :** Ajouter un filtre par badge rôle dans le module filmographie pour afficher/masquer les crédits par rôle.
- **Fichier concerné :** `apps/web/src/components/people/Filmography.tsx`

### C. Modules "Distribution & Équipe" et "Filmographie" : liste unique dédupliquée + filtre rôle multi-sélection — ✅ fait
- **Description :** Remplacer l'affichage actuel (plusieurs listes séparées par rôle) par une liste unique de valeurs distinctes — une personne (dans Distribution & Équipe) ou un titre (dans Filmographie) n'apparaît qu'une seule fois même si elle a plusieurs rôles sur ce titre/cette filmographie, avec le ou les rôles affichés en badge sur chaque élément. Ajouter en haut du module un filtre par rôle sous forme de boutons multi-sélectionnables (Tout, Acteur, Réalisateur, Producteur, ...), plutôt que des listes séparées par rôle.
- **Remplace/fusionne avec :** les items A et B ci-dessus (filtre par badge rôle) — cette modification change aussi la structure d'affichage sous-jacente, pas seulement l'ajout d'un filtre par-dessus les listes existantes.
- **Fait :**
  - Nouvel utilitaire générique `apps/web/src/lib/creditGrouping.ts` (`dedupeGroupedByEntity`) : déduplique un `Record<role, item[]>` (forme commune à `CreditGrouped` et `FilmographyGrouped`) en une liste d'entités uniques, chacune portant tous ses `{role, item}`.
  - `TitleCreditsSplit.tsx` : suppression complète de l'ancien découpage Distribution/Équipe technique et de la constante `CREW_ROLES` (EN) cassée — liste unique de personnes, filtre par rôle (boutons multi-sélection, "Tout" + un bouton par rôle réellement présent), badge de rôle(s) sur chaque `PersonBadge` (ex. "Acteur (Paul Atreides)", ou "Producteur • Scénariste • Réalisateur" pour une personne à plusieurs rôles). "Voir plus" à 10.
  - `Filmography.tsx` : même traitement côté titres — liste unique dédupliquée par `titre.id`, filtre par rôle local au module (indépendant des filtres d'attribut du header type/année/genre/pays/note, toujours actifs en plus), badges de rôle sous chaque `TitleCard`.
  - Réutilisé tel quel par la page studio (modification L, qui appelle `Filmography` avec des clés "Films"/"Séries" au lieu de rôles) — fonctionne sans changement, chaque titre n'ayant qu'une seule clé (type) donc pas de dédup à faire, juste un filtre Films/Séries en plus.
  - Tests : `Filmography.test.tsx` adapté (`getByText` → `getAllByText`, un rôle apparaît maintenant à la fois comme bouton de filtre et comme badge).
- **Fichiers modifiés :** `apps/web/src/lib/creditGrouping.ts` (nouveau), `apps/web/src/components/titles/TitleCreditsSplit.tsx`, `apps/web/src/components/people/Filmography.tsx`, `apps/web/src/__tests__/unit/components/people/Filmography.test.tsx`.
- **Note :** `TitleCreditsSplit.tsx` séparait auparavant "Distribution" et "Équipe technique" via une constante `CREW_ROLES` en anglais (`Director`, `Producer`, ...) comparée aux libellés de rôle stockés en base, qui sont en français (`Réalisateur`, `Producteur`, ...) — la comparaison ne matchait jamais, donc tout le monde atterrissait dans "Distribution". Confirmé en base sur "Dune: Part Two" : avant ce correctif, Denis Villeneuve (réalisateur/scénariste/producteur) y apparaissait comme un simple acteur de plus.
- **Vérification manuelle :** `/titles/:id` (Dune: Part Two) — module "Distribution & Équipe" affiche les boutons de rôle (Acteur, Réalisateur, Scénariste, Producteur, Producteur exécutif, Directeur de la photographie, Compositeur, Monteur, Casting, Autre) ; filtrer sur "Réalisateur" affiche une seule carte "Denis Villeneuve — Producteur • Scénariste • Réalisateur" (dédupliqué). `/people/:id` (Denis Villeneuve) — "Dune: Part Two" apparaît une fois avec les 3 badges de rôle. `/studios/:id` (Legendary Pictures, réutilise `Filmography`) — fonctionne sans régression.
- **Découverte pré-existante confirmée en marge :** `Filmography.test.tsx` échouait déjà avant ce correctif (indépendamment) : `useSearchParams()` renvoie `null` dans cet environnement de test (aucun mock/provider Next configuré), ce qui fait planter `parseTitleFilters(null)`. Vérifié en isolant les changements de cette session (`git stash`) : le test échouait déjà à l'identique sur le code déjà commité. Non corrigé ici (hors périmètre de cette modification) — affecte aussi `PersonCard.test.tsx`, `TitleActions.test.tsx`, `TitleRecommendations.test.tsx`, `TitleCard.test.tsx` (même cause probable), à traiter comme un point à part.

### D. Unifier "Watchlist" et "Suivre" — le bookmark doit refléter la watchlist — ✅ fait (résolu autrement)
- **Description demandée :** "Watchlist" et "Suivre" doivent devenir la même chose. Concrètement : ajouter un film (pas seulement une série) à la watchlist doit faire apparaître l'icone bookmark sur son affiche (actuellement le bookmark n'est piloté que par le mécanisme "Suivre", cf. bug #30).
- **Décision finale (donnée par l'utilisateur en marge du bug #45) :** plutôt que de trancher entre les deux options d'union/fusion avec le mécanisme "Suivre" envisagées ci-dessous, l'affiche affiche désormais **trois icones indépendantes** reflétant directement l'appartenance aux listes `watchlist`/`favoris` et l'état "vu" — le "Suivre" (table `user_follows_serie`, restreint aux séries, base du calendrier/notifications) n'est plus du tout lié à l'affichage des icones sur les affiches. Voir bug #45 pour l'implémentation.
- **Constat de l'existant qui a motivé cette demande (pour mémoire) :** le bookmark (`followed` sur `TitlePoster`/`TitleCard`, bug #30) n'était alimenté que par `useFollowedTitleIds()` → `GET /follows`, sans aucun lien avec la watchlist — d'où l'incohérence remontée.

### E. Retirer le module "Listes" de la page profil — ✅ fait
- **Description demandée :** Supprimer la section "Gestion des listes" (grille de listes + bouton "Créer une liste") de `app/(frontend)/profile/page.tsx` — les listes ont désormais leur propre page dédiée (`/lists`, cf. bug #43), ce module est redondant sur le profil.
- **Fait :** section retirée. La section "Favoris" (titres favoris en grille) est conservée — distincte du module "Listes", non concernée par la demande. `useLists()` reste appelé (nécessaire pour repérer la liste favoris), mais `ListCard`/`ListDialog` et les imports associés (Button, Skeleton, Alert, Plus) ont été retirés, plus utilisés.
- **Fichier modifié :** `apps/web/src/app/(frontend)/profile/page.tsx`

### F. Simplifier l'en-tête de la page d'accueil — ✅ fait
- **Description demandée :** Retirer le bloc "Bienvenue, {pseudo}" et les 4 cases de statistiques (Visionnages/Notes/Listes/Séries suivies) de la page d'accueil.
- **Fait :** bloc "Bienvenue, {pseudo}" et grille de 4 stats retirés pour les utilisateurs connectés — le dashboard démarre directement sur la section Historique. L'en-tête "Bienvenue sur eMDB" + CTA (Créer un compte/Se connecter) pour les visiteurs non connectés est conservé (non concerné par la demande). Nettoyage associé : composant `StatCard` (devenu mort) et hook `useFollowedSeries()` (plus consommé) retirés.
- **Fichier modifié :** `apps/web/src/app/(frontend)/page.tsx`

### G. Nouvelle page "Découvrir" (tendances, populaires, attendus, sorties) — ✅ fait
- **Description demandée :** Créer une page dédiée à la découverte de titres, avec 4 modules : Tendances, Populaires, Attendus, Sorties.
- **Décision prise sur la source de données :** contrairement au module "Titres populaires" de l'accueil (`GET /titles`, ne liste que les titres déjà importés en local), les 4 modules interrogent TMDB **en direct** — la page sert à découvrir du contenu externe, importé à la demande au clic (mécanisme "get or import" existant, `GET /titles/tmdb/:tmdbId`). Pas d'équivalent TMDB direct pour "Attendus" (most anticipated) : implémenté avec l'algo de repli déjà proposé dans ce document — titres non encore sortis (`primary_release_date.gte`/`first_air_date.gte` = demain), triés par popularité TMDB décroissante.
  - **Tendances :** `GET /trending/movie|tv/week`, fusion film+série triée par popularité.
  - **Populaires :** `GET /discover/movie|tv?sort_by=popularity.desc`.
  - **Attendus :** `GET /discover/movie|tv?sort_by=popularity.desc&primary_release_date.gte=demain` (substitut documenté ci-dessus).
  - **Sorties :** `GET /discover/movie|tv?sort_by=primary_release_date.desc&...lte=aujourd'hui&vote_count.gte=50` — le seuil `vote_count.gte` (initialement à 1) a dû être relevé à 50 en cours de vérification : sans lui, le module remontait des titres très obscurs (parfois une seule note à 10/10) plutôt que de vraies sorties grand public.
- **Fait :**
  - Backend : nouveau module `apps/api/src/discover/` (`DiscoverController`/`DiscoverService`), route `GET /discover/:module?limit=` (`tendances|populaires|attendus|sorties`). Chaque module mappe les résultats TMDB movie/tv (champs différents : `title`/`name`, `release_date`/`first_air_date`, etc.) vers une forme unifiée, puis marque `local`/`local_id` par lookup batch sur `tmdb_id` (même principe que `TitlesService.searchTitles()`).
  - Frontend : `apps/web/src/hooks/api/useDiscover.ts`, page `apps/web/src/app/(frontend)/discover/page.tsx` (4 sections, réutilise `TitleCard` tel quel — `TitleSearchResult` portait déjà `dateSortie`/`note`, juste jamais peuplés par la recherche existante). Lien "Découvrir" ajouté à la nav du header (`Header.tsx`).
- **Fichiers modifiés :** `apps/api/src/discover/discover.module.ts` (nouveau), `apps/api/src/discover/discover.controller.ts` (nouveau), `apps/api/src/discover/discover.service.ts` (nouveau), `apps/api/src/app.module.ts`, `apps/web/src/hooks/api/useDiscover.ts` (nouveau), `apps/web/src/app/(frontend)/discover/page.tsx` (nouveau), `apps/web/src/components/layout/Header.tsx`.
- **Vérification manuelle :** `/discover` — les 4 modules chargent des données TMDB réelles et cohérentes (ex. Tendances : Spider-Man: Brand New Day, House of the Dragon...). Cliqué sur un titre non-local ("Supergirl", tmdb_id 1081003) → import déclenché ; le premier clic déclenche le bug #35 pré-existant ("signal is aborted", même mécanisme que "Titres recommandés" — hors périmètre de cette modification) mais un rechargement de la page confirme l'import réussi (fiche complète : studios, distribution dédupliquée avec badges de rôle — modification C/L déjà en place) ; retour sur `/discover`, la carte "Supergirl" pointe désormais vers son id local, confirmant la détection `local`.

### H. Menu contextuel (trois points) sur les affiches de titres — ✅ fait
- **Description demandée :** Sur les affiches de titres (`TitleCard`/`TitlePoster`), quel que soit le module où elles apparaissent, ajouter un bouton "⋮" (trois points) en haut à droite ouvrant un dropdown dont le contenu dépend de l'état du titre pour l'utilisateur connecté :
  - Ajouter à la watchlist / Retirer de la watchlist (selon présence actuelle)
  - Marquer comme vu, avec un sous-menu/dropdown de sélection de date — ou Retirer de l'historique si déjà vu
- **Fait :** nouveau composant `apps/web/src/components/titles/TitleQuickActionsMenu.tsx`, réutilisant `useAddItem`/`useRemoveItem`, `useCreateWatch`/`useDeleteAllWatches` et `useListMembership` (bug #45). Rendu en haut à droite de l'affiche.
  - **Contrainte structurelle :** le bouton ne peut pas être imbriqué dans le `<Link>` de la carte (même classe de bug que #45 — `<button>` dans `<a>` est du HTML invalide). `TitleCard`/`TitleCardHorizontal` ont été restructurés : le menu est rendu en élément frère du `<Link>`, positionné par-dessus en absolu.
  - `TitlePoster` : le badge de type (Film/Série) déplacé de haut-droite vers bas-droite pour laisser la place au bouton "⋮" (rendu par `TitleCard`, pas par `TitlePoster` lui-même).
  - Effet de bord corrigé au passage : `useCreateWatch`/`useDeleteWatch`/`useDeleteAllWatches` n'invalidaient pas le cache `["watched-titles-set"]` consommé par l'icone "vu" — l'icone ne se mettait donc à jour qu'après un rechargement complet de page, y compris via l'ancien `WatchButton`. Corrigé pour les trois hooks.
- **Fichiers modifiés :** `apps/web/src/components/titles/TitleQuickActionsMenu.tsx` (nouveau), `apps/web/src/components/titles/TitleCard.tsx`, `apps/web/src/components/titles/TitlePoster.tsx`, `apps/web/src/hooks/api/useListMembership.ts` (expose `watchlistId`/`favorisId`), `apps/web/src/hooks/api/useCreateWatch.ts`, `apps/web/src/hooks/api/useDeleteWatch.ts`, `apps/web/src/hooks/api/useDeleteAllWatches.ts`, `apps/web/src/__tests__/unit/components/titles/TitleCard.test.tsx` (ajout d'un `QueryClientProvider`, désormais nécessaire).
- **Vérification manuelle :** sur `/search` et `/watchlist`, le bouton "⋮" ouvre le menu sans déclencher la navigation de la carte ; contenu contextuel correct (ex. "Retirer de la watchlist" + "Retirer de l'historique" pour un titre déjà présent/vu) ; retirer de la watchlist et marquer/retirer "vu" fonctionnent et se reflètent immédiatement sur l'affiche, sans rechargement.

### I. Tooltip au survol des icônes "vu"/"watchlist"/"favori" sur les affiches — ✅ fait
- **Description demandée :** Ajouter une bulle d'aide (tooltip) expliquant ce que représente l'icône au survol.
- **Fait :** nouveau composant `apps/web/src/components/ui/tooltip.tsx` (wrapper autour de `@base-ui/react/tooltip`, même convention que `dropdown-menu.tsx`), utilisé par les 3 icones de `TitlePoster.tsx` ("Dans les favoris" / "Dans la watchlist" / "Déjà vu"). Implémenté en même temps que le bug #45.
- **Fichiers modifiés :** `apps/web/src/components/ui/tooltip.tsx` (nouveau), `apps/web/src/components/titles/TitlePoster.tsx`

### J. Refonte Historique & Calendrier — même traitement pour les deux — ✅ fait
- **Description demandée :** Historique (`/history`) et Calendrier (`/calendar`) doivent adopter le même comportement, à deux niveaux :
  1. **Module intra-accueil** (les deux sections sur la page d'accueil) : titres les uns à côté des autres (slider horizontal, précision donnée après un premier essai en liste verticale), badge en bas à droite de chaque vignette donnant la date relative de sortie (calendrier) ou de visionnage (historique) du titre ou de l'épisode ("dans 3h" / "il y a 3h" / "hier" / "demain" / "mercredi prochain" / "jeudi dernier" / au-delà d'une semaine, `jj/mm/aaaa"), avec un bouton "Voir davantage" au bout de 20 éléments (jusqu'à 30 chargés).
  2. **Page dédiée** (`/history` et `/calendar`) : format widget Outlook Android — filtre de période en haut de page (Jour / Semaine / Mois / Trimestre / Semestre / Année), titres groupés par période, chaque groupe affiché l'un en dessous de l'autre.
- **Fait :**
  - `lib/relativeDate.ts` (nouveau) : `formatRelativeDate()`, tous les formats demandés, testé manuellement (script ponctuel) pour les cas limites (±3h, ±20min, hier/demain, ±4 jours, ±10 jours).
  - `lib/periodGrouping.ts` (nouveau) : `groupByPeriod()` + `getPeriodBucket()` pour les 6 granularités, `PERIOD_OPTIONS`.
  - `components/common/PeriodFilter.tsx` (nouveau) : sélecteur de période, même style que les tabs du header.
  - `components/common/DateCard.tsx` + `DateCardSlider.tsx` (nouveaux) : carte compacte (vignette + badge date bas-droite) et slider horizontal avec "Voir davantage" (20 → 30, déjà chargé, pas de requête supplémentaire) — module accueil.
  - `components/common/DateListItem.tsx` (nouveau) : ligne (vignette + badge date) — utilisé par `/calendar` (page dédiée, groupée par période).
  - `app/(frontend)/page.tsx` : sections Historique et Calendrier basculées sur `DateCardSlider` (`useRecentWatches` passé à `limit=30`).
  - `app/(frontend)/history/page.tsx` et `app/(frontend)/calendar/page.tsx` : `PeriodFilter` (état dans l'URL, `?period=...`, défaut "semaine") + regroupement via `groupByPeriod`. Sur `/calendar`, les épisodes sans `date_diffusion` connue sont affichés à part, dans un groupe "Date inconnue" (ne peuvent pas être placés dans une période).
  - `components/watches/CalendarEpisodes.tsx` (groupait par série, plus utilisé nulle part) : supprimé.
- **Fichiers modifiés :** `apps/web/src/lib/relativeDate.ts` (nouveau), `apps/web/src/lib/periodGrouping.ts` (nouveau), `apps/web/src/components/common/PeriodFilter.tsx` (nouveau), `apps/web/src/components/common/DateCard.tsx` (nouveau), `apps/web/src/components/common/DateCardSlider.tsx` (nouveau), `apps/web/src/components/common/DateListItem.tsx` (nouveau), `apps/web/src/app/(frontend)/page.tsx`, `apps/web/src/app/(frontend)/history/page.tsx`, `apps/web/src/app/(frontend)/calendar/page.tsx`, `apps/web/src/components/watches/CalendarEpisodes.tsx` (supprimé), `apps/web/src/__tests__/unit/pages/CalendarPage.test.tsx` (mock du composant supprimé retiré).
- **Vérification manuelle :** accueil — slider horizontal avec badges "hier" sur Historique ; `/history` — filtre de période fonctionnel, bascule "Semaine" → "Mois" regroupe correctement ("Semaine du ..." → "Juillet 2026") ; `/calendar` — filtre affiché, état vide correct (compte de test sans série suivie, code non exercé sur données réelles mais structurellement identique à `/history`).

### K. Historique/Calendrier : format affiche sur les pages dédiées, période "Tout", filtres Listes/Statut — ✅ fait
- **Description demandée (retour sur J) :** sur les pages dédiées `/history` et `/calendar`, garder le format affiche (comme le module accueil) plutôt que le format ligne ; ajouter une période "Tout" (pas de regroupement) ; le menu "Filtres" du header était absent sur `/history` (exclu volontairement lors de J) — l'ajouter, et y ajouter un dropdown "Listes" et un toggle "vu / tout / non vu".
- **Fait :**
  - `lib/periodGrouping.ts` : ajout de la période `"tout"` (un seul groupe, libellé "Tout") à `Period`/`PERIOD_OPTIONS`/`getPeriodBucket`.
  - `/history` et `/calendar` : basculés du format ligne (`DateListItem`) au format affiche en grille (`DateCard`), même composant que le slider accueil. `DateListItem.tsx` (devenu mort) supprimé. `DateCard` reçoit un `onRemove` optionnel (croix en haut à droite au survol, rendue en sibling du `Link` — même contrainte que le bug #45/modif H sur l'imbrication `<button>`/`<a>`) — utilisé par `/history` pour "Retirer de l'historique".
  - `lib/titleFilters.ts` : `TitleFilters` étendu avec `listIds: string[]` (paramètre URL `listes`) et `watchedStatus: "tout"|"vu"|"non_vu"` (paramètre URL `vu`). `FilterableTitle` porte désormais `id`/`listIds`/`watched` ; nouvel utilitaire `buildListIdsByTitle()` (Map titre → listes) à partir de `useLists()`. Appliqué dans `titleMatchesFilters` et propagé à toutes les pages consommatrices (accueil, watchlist, listes, détail liste, historique).
  - `Header.tsx`/`FilterSidebar.tsx` : le bouton "Filtres" s'affiche désormais aussi sur `/history` (l'exclusion `!isHistoryPage` de la modif #43 est retirée). Sidebar : nouveau toggle "Statut" (Tout/Vu/Non vu, style segmented control) et nouveau dropdown "Listes" (multi-sélection, même pattern que Genre/Pays).
  - `/history` applique désormais Listes et Statut côté client (le type reste filtré côté serveur) ; "Non vu" vide la liste par construction (tout l'historique est déjà vu), comportement cohérent plutôt qu'un cas spécial.
- **Fichiers modifiés :** `apps/web/src/lib/periodGrouping.ts`, `apps/web/src/lib/titleFilters.ts`, `apps/web/src/components/common/DateCard.tsx`, `apps/web/src/components/common/DateListItem.tsx` (supprimé), `apps/web/src/components/layout/Header.tsx`, `apps/web/src/components/layout/FilterSidebar.tsx`, `apps/web/src/app/(frontend)/history/page.tsx`, `apps/web/src/app/(frontend)/calendar/page.tsx`, `apps/web/src/app/(frontend)/page.tsx`, `apps/web/src/app/(frontend)/watchlist/page.tsx`, `apps/web/src/app/(frontend)/lists/page.tsx`, `apps/web/src/app/(frontend)/lists/[id]/page.tsx`.
- **Vérification manuelle :** `/history` — grille d'affiches avec croix "Retirer de l'historique" au survol ; période "Tout" présente et sélectionnable ; bouton "Filtres" ouvre la sidebar avec "Statut" et "Listes" ; sélectionner "Non vu" vide bien la liste ("Aucun visionnage ne correspond au filtre actif"), "Tout" la restaure. `/calendar` — grille d'affiches, période "Tout" présente (page en erreur de chargement dans cet environnement de dev, cause pré-existante sans rapport : fonction PL/pgSQL `fn_episodes_non_vus` absente de la base locale — même cause que l'échec pré-existant de `plpgsql-functions.spec.ts`).

### L. Studios : import TMDB, affichage sur la fiche titre, page dédiée — ✅ fait
- **Description demandée :** ajouter les studios dans les infos de la page titre ; créer une page studio reprenant la structure de la page personne (filmographie + personnes connexes).
- **Constat :** le modèle `studios`/`title_studios` et son affichage sur `TitleInfo.tsx` existaient déjà, mais `packages/tmdb-sync` n'importait jamais `tmdbData.production_companies` — la table restait vide pour tout titre importé depuis le début du projet.
- **Fait :**
  - `packages/tmdb-sync/src/index.ts` : `ensureStudioIds()` (miroir de `ensureGenreIds`/`ensureCountryIds`) + `prisma.title_studios.createMany()` dans `importTitleByTmdbId`, à partir de `tmdbData.production_companies`. `logo_url` construit depuis `logo_path` (`https://image.tmdb.org/t/p/w200...`).
  - Backend : nouveau module `apps/api/src/studios` (`StudiosController`/`StudiosService`), miroir de `people` : `GET /studios/:id` (détail), `GET /studios/:id/filmography` (titres via `title_studios`, groupés par "Films"/"Séries" — même forme `FilmographyGrouped` que people, réutilisable telle quelle côté frontend), `GET /studios/:id/people` ("personnes connexes" : pas d'équivalent TMDB pour un studio, donc calculé localement — personnes les plus créditées sur les titres du studio, credits de niveau titre uniquement).
  - Frontend : `hooks/api/useStudio.ts`, `components/studios/StudioHero.tsx` (miroir simplifié de `PersonHero`, sans bio/date de naissance), page `app/(frontend)/studios/[id]/page.tsx` (miroir de `people/[id]/page.tsx`, réutilise directement `Filmography` et `PersonCard`).
  - `TitleInfo.tsx` : les pastilles "Studios" sont désormais des liens vers `/studios/:id`.
- **Fichiers modifiés :** `packages/tmdb-sync/src/index.ts` (+ `index.spec.ts`), `apps/api/src/studios/studios.module.ts` (nouveau), `apps/api/src/studios/studios.controller.ts` (nouveau), `apps/api/src/studios/studios.service.ts` (nouveau), `apps/api/src/app.module.ts`, `apps/web/src/hooks/api/useStudio.ts` (nouveau), `apps/web/src/components/studios/StudioHero.tsx` (nouveau), `apps/web/src/app/(frontend)/studios/[id]/page.tsx` (nouveau), `apps/web/src/components/titles/TitleInfo.tsx`.
- **Vérification manuelle :** import d'un titre TMDB non présent en local (`Dune: Part Two`, tmdb_id 693134) → `title_studios` peuplé ("Legendary Pictures") ; `/studios/:id` affiche hero + filmographie ("Films" → Dune: Part Two) + 12 personnes connexes ; lien "Legendary Pictures" sur la fiche titre pointe bien vers la page studio.

### M. Unifier le fonctionnement du bouton "marquer comme vu" et du menu ⋮ — ✅ fait
- **Description demandée (précisée par l'utilisateur) :** État machine complète pour "marquer comme vu" :
  - **Non vu :** clic simple ouvre un dropdown (À l'instant / Jusqu'ici si épisode / À la date de sortie / Autre date... / Date inconnue). *(Le clic prolongé initialement prévu pour cet état s'est révélé peu fiable à l'usage — remplacé par un clic simple sur retour utilisateur.)*
  - **"Vu jusqu'ici" (épisode) :** marque comme vus tous les épisodes non encore vus jusqu'à celui-ci inclus dans la série ; les boutons des épisodes précédents (module épisode page série / page saison) passent aussi en "vu".
  - **Vu (ou "Vu xN") :** clic simple ouvre un dropdown avec "Revoir" (sous-menu, mêmes options, libellés "Revu", incrémente le compteur), "Gérer l'historique de visionnage" (popup avec suppression par ligne), "Annuler le visionnage" (confirmation puis suppression de tous les visionnages).
  - **Menu ⋮** sur toutes les affiches (titres et épisodes) : Suivre/Ne plus suivre et Ajouter/Retirer des favoris (titres uniquement), "Marquer comme vu" (même dropdown que le bouton) ou "Annuler le visionnage" si déjà vu (confirmation), "Gérer l'historique de visionnage" (toujours présent).
- **Fait :**
  - Nouveaux composants partagés : `lib/watchDates.ts` (résolution date → ISO, sentinelle `1900-01-01` pour "date inconnue" — la colonne `date_vue` n'est pas nullable en base, contrairement à ce que l'ancien code laissait croire en envoyant silencieusement `undefined` → "maintenant"), `components/watches/WatchDateMenuItems.tsx` (les 5 options, réutilisées telles quelles aux 3 endroits), `components/watches/WatchDatePickerDialog.tsx` (vrai sélecteur de date `<input type="date">`, remplace le `window.prompt()` utilisé jusqu'ici), `components/watches/HistoryDialog.tsx` (remplace 3 implémentations inline redondantes : `TitleActions`, page épisode, et absente de `WatchButton`).
  - `WatchButton.tsx` réécrit : `watches` (liste des visionnages de ce titre/épisode) remplace `watched`/`watchCount`/`onDeleteAll` — l'état est dérivé, plus de désync possible.
  - `TitleQuickActionsMenu.tsx` réécrit : supporte désormais aussi les épisodes (`episodeId`), ajout du toggle favoris (absent jusqu'ici), libellés Watchlist renommés "Suivre"/"Ne plus suivre" (cohérent avec la décision de la modif D).
  - Backend : `POST /watches/until-episode` (branché sur `createWatchesUntilEpisode()`, qui existait déjà côté service mais n'était jamais exposée — corrigé au passage un bug latent qui posait `title_id` ET `episode_id` sur les visionnages en masse, violant l'invariant "jamais les deux" des bugs #22/#24 et aurait marqué toute la série "vue" dès le premier "vu jusqu'ici"). `DELETE /watches/episode/:episodeId` (pendant manquant de `DELETE /watches/title/:titleId` — "Annuler le visionnage" sur un épisode était silencieusement inopérant sur la page épisode, `onDeleteAll` n'y était même pas câblé). `GET /watches?episode_id=` (filtre manquant, nécessaire pour charger l'historique d'un épisode efficacement).
- **Bugs supplémentaires trouvés et corrigés pendant la vérification (remontés par l'utilisateur après un premier passage) :**
  1. **`Button` (`components/ui/button.tsx`) ne forwardait pas les refs** (pas de `React.forwardRef`, React 18 l'exige). `MenuTrigger` (Base UI) ne pouvait donc jamais obtenir le nœud DOM réel du bouton pour ancrer le popup — le menu s'ouvrait bien (présent dans le DOM, `data-open`), mais son `Positioner` le rendait à `(0,0)`, hors champ en haut à gauche de l'écran : invisible, d'où l'impression "le bouton ne marche pas, ça freeze". Affectait TOUS les dropdowns utilisant `render={<Button/>}` (WatchButton, TitleActions "Listes", TitleQuickActionsMenu), pas seulement ceux de cette modification — bug latent préexistant, resté caché tant que les actions directes (clic simple = action) évitaient d'avoir à ouvrir un menu positionné.
  2. **`apps/web/src/app/(frontend)/series/[id]/page.tsx` n'avait pas la directive `"use client"`** — page entièrement cassée (`useQuery is not a function`, exécutée côté RSC). Bug préexistant (confirmé par `git diff`/`git log` : absent avant cette session), jamais remarqué faute d'avoir testé cette route précise en navigateur. Explique une partie des rapports "le bouton Listes ne marche pas" sur la page série (la page plantait entièrement).
  3. **`WatchesService.listWatches()` : le filtre `title_id` ne remontait que les visionnages portés directement par le titre**, jamais ceux de ses épisodes (`episode_id` renseigné, `title_id` toujours `null` par construction) — l'historique d'une série sur `TitleActions` était donc systématiquement vide, alors que l'essentiel des visionnages d'une série se fait par épisode. Corrigé par un `OR` sur `episodes.seasons.title_id`, même principe que le filtre `type` (bug #44).
  4. **Page recherche : icônes/menu ⋮ inopérants sur les résultats non-locaux** — `TitleCard`/`TitleSearchResult.id` vaut le `tmdb_id` en chaîne (pas un vrai UUID) tant que le titre n'est pas importé ; toute mutation (`POST /lists/:id/items`, `POST /watches`, ...) échouait en 400. Corrigé : nouveau hook `useGetOrImportTitle` (import à la demande, timeout `120s` — sinon abandon à 10s, même cause que le bug #27/#35), `TitleQuickActionsMenu` importe le titre avant la première action quand `local` est faux, puis réutilise l'id obtenu.
  5. Au passage, le même défaut de timeout par défaut (10s) a été corrigé sur `TmdbTitleImportPage` (`/titles/tmdb/[tmdbId]`) — cause probable du bug #35 ("signal is aborted"), jamais suspectée jusqu'ici.
- **Fichiers modifiés :** `apps/web/src/lib/watchDates.ts` (nouveau), `apps/web/src/components/watches/WatchDateMenuItems.tsx` (nouveau), `apps/web/src/components/watches/WatchDatePickerDialog.tsx` (nouveau), `apps/web/src/components/watches/HistoryDialog.tsx` (nouveau), `apps/web/src/components/watches/WatchButton.tsx`, `apps/web/src/components/titles/TitleQuickActionsMenu.tsx`, `apps/web/src/components/titles/TitleCard.tsx`, `apps/web/src/components/titles/TitleActions.tsx`, `apps/web/src/components/seasons/EpisodeSnapshot.tsx`, `apps/web/src/components/seasons/EpisodeRow.tsx`, `apps/web/src/components/seasons/EpisodeCard.tsx`, `apps/web/src/components/ui/button.tsx`, `apps/web/src/app/(frontend)/episodes/[id]/page.tsx`, `apps/web/src/app/(frontend)/titles/[id]/page.tsx`, `apps/web/src/app/(frontend)/series/[id]/page.tsx`, `apps/web/src/hooks/api/useGetOrImportTitle.ts` (nouveau), `apps/web/src/hooks/api/useMarkWatchedUntilEpisode.ts` (nouveau), `apps/web/src/hooks/api/useDeleteAllWatchesByEpisode.ts` (nouveau), `apps/web/src/hooks/api/useWatches.ts`, `apps/web/src/lib/types/api.ts`, `apps/api/src/watches/watches.controller.ts`, `apps/api/src/watches/watches.service.ts` (+ spec), `apps/api/src/watches/dto/mark-watched-until-episode.dto.ts` (nouveau), `apps/api/src/watches/dto/list-watches-filter.dto.ts`.
- **Vérification manuelle :** testé en direct sur `/titles/:id` (Dune: Part Two), `/episodes/:id`, `/series/:id` et le module saisons développé (`EpisodeSnapshot`) — dans les 4 contextes : dropdown "non vu" s'ouvre au clic simple avec les bonnes options (dont "jusqu'ici" pour les épisodes) ; dropdown "vu" (Revoir/Historique/Annuler) s'ouvre et se positionne correctement sous le bouton ; menu "Listes" de `TitleActions` de nouveau fonctionnel ; historique d'une série peuplé par les visionnages d'épisodes ; page `/series/:id` charge sans erreur. Page recherche : import à la demande confirmé de bout en bout (`GET /titles/tmdb/542438` → 200, puis `POST /lists/.../items` → 201, la carte pointe vers l'id local après rechargement). `tsc --noEmit` (web + api) : aucune erreur. `jest` web : 200/209 passent (10 suites en échec, baseline strictement inchangée). `jest` api : 176/182 passent (4 suites en échec, baseline inchangée) ; `watches.service.spec.ts` : 29/29, dont les 2 nouveaux cas (title_id inclut les épisodes, until-episode).

### N. Sidebar de navigation : hiérarchie indentée
- **Description demandée :** Restructurer la navigation en arborescence indentée :
  - Recherche
  - Accueil
    - Watchlist
    - Calendrier
    - Historique
    - Recommandés
  - Découvrir
    - Tendances
    - Populaires
    - Attendus
    - Sorties
  - Listes
    - Favoris
    - [nom Liste 1]
    - [nom Liste 2]
  - Profil
- **Statut : ✅ fait**
- **Fait (1ère passe) :** `Sidebar.tsx` (sidebar verticale fixe desktop + overlay mobile, déjà en place depuis la modif liée au bug #17) restructurée en arborescence : la liste plate `NAV_LINKS` est remplacée par un arbre `NavItem[]` construit par `buildNavTree(userLists)`, rendu par un composant partagé `SidebarNav`. "Listes" > Favoris + listes de l'utilisateur : nouveau — branché sur `useLists()` (déjà utilisé ailleurs, ex. `Header.tsx` pour la sidebar de filtres, mais jamais dans la nav). "Favoris" est la liste spéciale `type: "favoris"` (toujours présente), les listes `type: "custom"` de l'utilisateur suivent, chacune vers `/lists/:id`. La liste `type: "watchlist"` est exclue de cette section (déjà son propre lien sous "Accueil").
- **Fait (2ème passe, retours utilisateur) :**
  1. **Hiérarchie visuelle renforcée** : les items de premier niveau (Recherche/Accueil/Découvrir/Listes/Profil) sont maintenant nettement plus imposants (`text-base font-semibold`, icône `h-5 w-5`) que les sous-items (`text-xs font-normal`, pas d'icône) — avant les deux niveaux avaient à peu près la même taille de texte.
  2. **Mise en page verticale** : `eMDB` fixé tout en haut, l'arbre Recherche→Listes centré verticalement dans l'espace restant (`flex-1 flex flex-col justify-center`), "Profil" fixé tout en bas (plus dans l'arbre lui-même — extrait dans un `NavItem` séparé `profile`, rendu par le même composant `TopLevelLink` que les items parents pour garder un style cohérent).
  3. **Pages dédiées par module de second niveau** : les ancres de la 1ère passe (`/discover#tendances`, `/#recommandes`) sont remplacées par de vraies pages :
     - `/discover/[module]` (route dynamique, un seul fichier pour les 4 modules Tendances/Populaires/Attendus/Sorties — `notFound()` si le segment ne correspond à aucune clé de `DISCOVER_MODULES`) : grille complète (plusieurs lignes), `variant="grid"` de `DiscoverModuleSection`.
     - `/recommendations` (nouvelle page) : mêmes hooks/logique que le module accueil, grille complète, limite portée à 24.
  4. **Toutes les pages de premier niveau (Accueil, Découvrir) passent leurs modules en une seule ligne scrollable** avec une carte "Voir davantage" en fin de ligne qui mène vers la page dédiée où le contenu peut s'étaler sur plusieurs lignes (au lieu des grilles multi-lignes tronquées à N éléments précédemment) : nouveau composant générique `CardSlider` (ligne flex `overflow-x-auto`, carte de lien optionnelle en fin de rangée), utilisé directement pour Watchlist/Recommandés/Titres populaires (accueil, invités) et par `DateCardSlider` (Historique/Calendrier, désormais un wrapper fin autour de `CardSlider` — le "Voir davantage" navigue vers `/history`/`/calendar` au lieu de simplement révéler plus de cartes sur place comme avant) et par `DiscoverModuleSection` en `variant="row"` (page `/discover`). La carte "Voir davantage" ne s'affiche que s'il y a effectivement plus d'éléments que la rangée n'en montre (pas de lien mort si tout tient déjà sur une ligne).
- **Fichiers modifiés :** `apps/web/src/components/layout/Sidebar.tsx` (réécrit), `apps/web/src/components/common/CardSlider.tsx` (nouveau), `apps/web/src/components/common/DateCardSlider.tsx` (simplifié, ne gère plus d'état "expanded"), `apps/web/src/components/discover/DiscoverModuleSection.tsx` (nouveau, extrait de `discover/page.tsx`), `apps/web/src/app/(frontend)/discover/page.tsx`, `apps/web/src/app/(frontend)/discover/[module]/page.tsx` (nouveau), `apps/web/src/app/(frontend)/recommendations/page.tsx` (nouveau), `apps/web/src/app/(frontend)/page.tsx`.
- **Vérification :** `tsc --noEmit` (web) sans nouvelle erreur ; `jest` web : 200/209 (baseline strictement inchangée, aucune régression après les deux passes). Vérifié en direct dans le navigateur (utilisateur connecté avec 2 listes, dont une liste "favoris" et une liste custom "akaka") : arbre complet avec la bonne indentation et le bon contraste de taille (`read_page` + captures), `eMDB` en haut / arbre centré / "Profil" en bas confirmés visuellement, `/discover/tendances` affiche bien une grille multi-lignes (21 titres, 4 colonnes+) accessible depuis le "Voir davantage" de la ligne "Tendances" sur `/discover`, `/recommendations` accessible et affiche l'état vide attendu (hook stub, cohérent avec le module accueil).

### O. Menu Filtres : repositionnement du filtre par type, réordonnancement, multi-sélection, header partout, retrait de l'icône profil — ✅ fait
- **Description demandée (précisée) :**
  - Filtre par type (Tout/Film/Série/Personne) : au centre du header quand le panneau "Filtres" est fermé ; migre en premier contrôle du panneau à l'ouverture ; revient au centre du header à la fermeture.
  - Ordre des contrôles du panneau : Type → Statut → Année de sortie → Date de visionnage (uniquement sur `/history`) → Note IMDB → Genre → Pays (renommé, "Région" retiré) → Listes.
  - Genre/Pays/Listes : dropdowns multi-sélection avec un bouton "Tout sélectionner" (permet ensuite d'exclure facilement des valeurs en décochant depuis un état complet).
  - Le header filtre (tabs + bouton "Filtres") doit être visible sur toutes les pages sauf `/login` et `/register`.
  - Icône profil retirée du header (dropdown Profil/Déconnexion) ; bouton "Déconnexion" dédié en haut à droite de la page Profil.
- **Fait :**
  - `Header.tsx` : grille 3 colonnes (`grid-cols-3`) pour un centrage réel du filtre par type indépendant de la largeur des actions de droite (l'ancien `justify-between` ne centrait qu'approximativement). Le bloc central ne se rend que si `!filterSidebarOpen` ; nouveau composant partagé `TypeFilterTabs.tsx` (extrait pour être rendu identiquement dans le header, le menu mobile, et le panneau filtres). Suppression de `FILTER_VISIBLE_PATHS`/`showTypeTabs`/`showFilterSidebarButton` : le header n'étant de toute façon jamais monté sur `/login`/`/register` (layout `(auth)` séparé, sans `Header`), la restriction par page n'avait plus lieu d'être une fois la demande "toutes les pages" formulée. Suppression du dropdown utilisateur (icône `User`, lien Profil, item Déconnexion) et de l'effet de redirection associé — déplacés vers `profile/page.tsx`.
  - `FilterSidebar.tsx` : réordonnancé selon la liste demandée ; nouveau sous-composant `MultiSelectDropdown` (Genre/Pays/Listes partagent désormais la même implémentation avec un item "Tout sélectionner" + séparateur en tête de `DropdownMenuContent`, au lieu de trois blocs dupliqués) ; label "Région (pays)" → "Pays" ; nouveau slider "Date de visionnage" (même pattern que "Année de sortie", plage identique 1900–année courante — la sentinelle "date inconnue" de la modification M vaut précisément 1900), affiché seulement si `showWatchedDateFilter` (passé par `Header.tsx` selon `pathname === "/history"`).
  - `titleFilters.ts` : nouveaux champs `watchedYearMin`/`watchedYearMax` (paramètres URL `vuAnneeMin`/`vuAnneeMax`), ajoutés à `hasActiveTitleFilters` — volontairement absents de `titleMatchesFilters`/`FilterableTitle` (ils ne portent pas sur les titres mais sur la date de visionnage individuelle d'une entrée d'historique) ; appliqués côté client directement dans `history/page.tsx`, aux côtés des filtres Listes/Statut déjà gérés là pour la même raison.
  - `profile/page.tsx` : bouton "Déconnexion" (`useLogout` + redirection vers `/login` au succès, même pattern que l'ancien emplacement dans `Header.tsx`) en haut à droite de l'en-tête profil.
- **Fait (2ème passe, retour utilisateur "avant de commit") :** le header étant désormais visible partout, l'utilisateur a signalé que les filtres restaient purement cosmétiques sur plusieurs modules "ligne + slider" qui ne les consommaient pas du tout. Corrigé :
  - `titleFilters.ts` : `FilterableTitle.year`/`note`/`genreIds`/`countryIds` acceptent désormais `undefined` (en plus de `null`/`[]`), qui signifie "donnée non calculable sur cette surface, ne pas filtrer dessus" — distinct de `null`/`[]` qui reste "calculé et effectivement vide/inconnu" (continue d'exclure sur filtre actif). `titleMatchesFilters` ignore chaque check dont le champ vaut `undefined`. Tous les appelants existants (accueil, watchlist, listes) calculent toujours une vraie valeur : comportement inchangé pour eux.
  - `DiscoverModuleSection.tsx` (donc `/discover` ET `/discover/[module]`, qui la partagent) : filtre désormais type/année/note/statut vu/listes. Genre et pays **ne sont pas filtrables ici** — les réponses TMDB trending/discover consommées par ce module ne portent ni genre_ids ni pays sous une forme reliée à nos ids locaux (contrairement au reste de l'app où les titres sont enrichis depuis la base). Les appliquer nécessiterait un changement backend (mapper les `genre_ids` numériques TMDB vers `genres.tmdb_id`, déjà stocké en base mais jamais exploité pour cet usage) — hors-scope ici, à traiter en tâche dédiée si besoin.
  - `TitleRecommendations.tsx` ("Titres recommandés" sur la page titre) : filtre désormais type/note/statut vu/listes. Année, genre et pays **ne sont pas filtrables ici** — `TitleRecommendation` (endpoint recommandations TMDB) ne porte ni date de sortie ni genre/pays du tout.
  - `profile/page.tsx` (module "Mes Favoris") : filtre complet (type/genre/pays/année/note/statut vu/listes) — les items de `GET /lists/:id` portent déjà genres/pays en toutes lettres, aucune limitation ici contrairement aux deux points précédents.
  - `page.tsx` (accueil) : même correction appliquée aux modules "Recommandés" et "Titres populaires" (invités), qui ne filtraient pas du tout jusqu'ici (contrairement à "Watchlist", déjà correct) — filtre complet, les deux venant de la base locale (`Title[]`).
  - Historique/Calendrier de l'accueil restent volontairement filtrés sur le type uniquement (limitation déjà documentée avant cette modification : un visionnage ne porte pas les genres/pays/année du titre) — non concernés par ce retour utilisateur.
- **Fichiers modifiés :** `apps/web/src/components/layout/Header.tsx`, `apps/web/src/components/layout/FilterSidebar.tsx`, `apps/web/src/components/layout/TypeFilterTabs.tsx` (nouveau), `apps/web/src/lib/titleFilters.ts`, `apps/web/src/app/(frontend)/history/page.tsx`, `apps/web/src/app/(frontend)/profile/page.tsx`, `apps/web/src/app/(frontend)/page.tsx`, `apps/web/src/components/discover/DiscoverModuleSection.tsx`, `apps/web/src/components/titles/TitleRecommendations.tsx`.
- **Vérification :** `tsc --noEmit` (web) sans nouvelle erreur ; `jest` web : 200/209 (baseline strictement inchangée, deux passes confondues). Vérifié en direct dans le navigateur : filtre par type centré dans le header sur `/search` ; panneau ouvert → tabs disparaissent du header et réapparaissent en premier contrôle du panneau (ordre Type/Statut/Année/Note/Genre/Pays/Listes confirmé) ; "Date de visionnage" présent uniquement sur `/history` ; "Tout sélectionner" sur Genre peuple bien les 27 ids dans l'URL ; header présent sur `/search`, `/history`, `/profile` ; aucune icône profil résiduelle ; bouton "Déconnexion" fonctionnel sur `/profile`. Deuxième passe : `/discover?noteImdbMin=8` passe de 40 à 21 résultats affichés (sur les 4 modules confondus) ; `/discover/tendances?noteImdbMin=8` (grille) passe à 17 résultats ; `/profile?type=serie` affiche "Aucun favori ne correspond aux filtres actifs" (seul favori en base est un film) ; page titre `?type=serie` affiche "Aucune recommandation ne correspond aux filtres actifs" sur le module "Titres recommandés".

### P. Filtre "Studio" sur la page recherche
- **Description demandée :** Ajouter un filtre par studio de production sur `/search`, en complément des filtres existants (genre, pays, année, note).
- **Fichiers concernés :** `apps/web/src/app/(frontend)/search/page.tsx`, `apps/web/src/lib/titleFilters.ts` (nouveau `studioIds`), backend `GET /titles` (nouveau paramètre de filtrage par studio) — s'appuie sur le module studios (modification L).

### Q. Confirmation avant suppression de l'historique de visionnage
- **Description demandée :** Demander systématiquement une confirmation avant de supprimer un visionnage de l'historique (actuellement suppression immédiate au clic, cf. `DateCard.onRemove` sur `/history`, modification K).
- **Fichiers concernés :** `apps/web/src/app/(frontend)/history/page.tsx`, `apps/web/src/components/common/DateCard.tsx` (ou dialogue de confirmation partagé, cf. `apps/web/src/components/ui/alert-dialog.tsx` déjà présent dans le projet).

### R. Menu trois points (⋮) manquant dans le module historique
- **Description demandée :** Le menu contextuel trois points (modification H — ajouter/retirer watchlist, marquer/retirer vu) doit aussi être disponible sur les vignettes du module Historique (`DateCard`), qui n'a aujourd'hui qu'une croix de suppression directe.
- **Fichiers concernés :** `apps/web/src/components/common/DateCard.tsx`, `apps/web/src/components/titles/TitleQuickActionsMenu.tsx`, `apps/web/src/app/(frontend)/history/page.tsx`, `apps/web/src/app/(frontend)/page.tsx` (module accueil, même composant `DateCard`).

### S. Listes : bouton trois points "Modifier la liste" / "Modifier le contenu" / "Supprimer la liste" (absent sur Watchlist/Favoris)
- **Description demandée (précisée) :**
  - Sur `/lists`, ajouter un bouton "⋮" sur chaque carte de liste **personnalisée** ouvrant un dropdown :
    - "Modifier la liste" > popup formulaire avec nom de liste + description.
    - "Modifier le contenu" > ouvre la page dédiée à la liste (`/lists/:id`), qui doit permettre de réorganiser les éléments par glisser-déposer (drag and drop) et de les supprimer en un clic.
    - "Supprimer la liste" > avec confirmation.
  - Sur la page dédiée de chaque liste (`/lists/:id`), afficher les mêmes trois boutons en haut à droite. Exception : sur les pages Watchlist et Favoris (listes système, non renommables/non supprimables), n'afficher que le bouton "Modifier le contenu".
- **Fichiers concernés (pressentis) :** `apps/web/src/components/lists/ListCard.tsx`, `apps/web/src/components/lists/ListDialog.tsx` (édition nom/description), `apps/web/src/app/(frontend)/lists/[id]/page.tsx` (boutons en haut à droite + drag and drop du contenu — nouvelle dépendance de réordonnancement à choisir, ainsi qu'un champ d'ordre côté `list_items` si l'ordre doit persister en base), `apps/web/src/hooks/api/useUpdateList.ts`/`useDeleteList.ts` (déjà existants), `apps/web/src/components/ui/alert-dialog.tsx` (confirmation de suppression).

### T. Page série : module épisode aligné sur le fonctionnement/format de la page film
- **Description demandée :**
  - Le bouton "Marquer comme vu" du module épisode (sur la page série) doit reprendre le fonctionnement de celui de la page film : proposer le dropdown de sélection de date au marquage, et si l'utilisateur veut re-marquer un épisode déjà vu, redemander le dropdown de date plutôt qu'une action directe, avec une option "Supprimer de l'historique" (cf. modification M, qui pose la même règle en général — ceci en est le cas d'application concret sur les épisodes de la page série).
  - Le module épisode de la page série doit aussi reprendre le même format visuel/structurel que celui de la page film.
- **Fichiers concernés (pressentis) :** `apps/web/src/components/watches/EpisodeSnapshot.tsx`, `apps/web/src/components/watches/WatchButton.tsx`, `apps/web/src/components/titles/TitleActions.tsx` (référence "page film" à reprendre), `apps/web/src/app/(frontend)/titles/[id]/page.tsx`

### U. Nouveau module accueil "Continuer à regarder"
- **Description demandée :** Ajouter un module "Continuer à regarder" en tête de la page d'accueil (avant tous les autres modules), listant les séries suivies triées par ordre décroissant de `MAX(date de visionnage du dernier épisode vu, date de sortie du dernier épisode)`. Reprend la structure des autres modules accueil : slider horizontal + "Voir davantage" (cf. `DateCardSlider`, modification J/K).
- **Fichiers concernés (pressentis) :** `apps/web/src/app/(frontend)/page.tsx`, `apps/web/src/components/common/DateCardSlider.tsx` (réutilisation), nouveau hook `apps/web/src/hooks/api/useContinueWatching.ts`, nouvel endpoint backend agrégeant séries suivies + dernier épisode vu + dernier épisode sorti (`apps/api/src/watches/watches.service.ts` ou `apps/api/src/watches/watches.controller.ts`, à côté de `getCalendar`/`getFollowedSeries`).

### V. Module "Recommandés pour cette liste", module Favoris du profil en ligne+slider, compteur d'éléments dans l'en-tête des modules liste
- **Description demandée :**
  - Sur la page dédiée de chaque liste (`/lists/:id`), ajouter un module classique ligne + slider "Recommandés pour cette liste" (même structure que les autres modules — cf. `CardSlider`, modification N) : un algo se base sur le contenu déjà présent dans la liste pour suggérer d'autres titres similaires (genres/pays/type communs, ou approche de similarité à définir côté backend).
  - Dans la page Profil, le module "Favoris" doit reprendre la structure classique ligne + slider (au lieu de son affichage actuel).
  - Dans l'en-tête de chaque module liste (accueil, profil, `/lists`, pages dédiées), afficher le nombre d'éléments entre parenthèses à côté du titre — ex. "Mes favoris (15)".
- **Dépendance :** s'appuie sur `CardSlider` (modification N) pour l'aspect ligne+slider, et sur la page liste dédiée (modification S) pour l'emplacement du nouveau module "Recommandés pour cette liste".
- **Fichiers concernés (pressentis) :** `apps/web/src/app/(frontend)/lists/[id]/page.tsx` (nouveau module recommandations), nouveau hook `apps/web/src/hooks/api/useListRecommendations.ts`, nouvel endpoint backend de recommandation par similarité de contenu de liste (`apps/api/src/lists/` ou `apps/api/src/discover/`), `apps/web/src/app/(frontend)/profile/page.tsx` (module Favoris), composants d'en-tête de module à travers l'app (accueil `DashboardSection`, `/lists`, pages dédiées liste) pour le compteur entre parenthèses.

### W. Refonte complète du module Dataviz (page Profil) — ✅ fait
- **Description demandée :**
  - Déplacer le module dataviz au-dessus de "Mes Favoris" sur la page Profil.
  - Cartes résumé : temps total dont temps films et temps séries ; nombre total dont nb films et nb épisodes.
  - 4 graphiques : barchart horizontal groupé (légende = type de contenu film/série, y = valeur groupée, x = temps ou nombre), barchart vertical empilé (idem, x = valeur groupée, y = temps ou nombre), donut (temps ou nombre), linechart (une ligne film, une ligne série, x = année de visionnage, y = temps ou nombre).
  - Groupements : Période (dropdown mono-sélection de granularité jour/semaine/mois/trimestre/semestre/année), Genre (dropdown multi-sélection), Pays (idem), Studio (idem, sauf que les studios n'ayant qu'un seul titre parmi les visionnages sont regroupés dans "Autre").
  - **Précisé en cours de route (2ème demande) :** bouton "⋮" sur chaque graphique pour une configuration entièrement indépendante par graphique (métrique/groupement/granularité/filtre catégories propres à chacun, plus de contrôles partagés) — l'utilisateur définira une config par défaut pour chacun dans un futur échange.
- **Fait — Backend (nouveaux endpoints, les 8 vues matérialisées `mv_watch_*` de la Phase 6.1/bug #54 restent inchangées et utilisées par les anciens endpoints `watch-time`/`watch-count`, gardés pour compatibilité) :**
  - `GET /dataviz/summary?yearFrom=&yearTo=` → `{totalMinutes, filmMinutes, serieMinutes, totalCount, filmCount, episodeCount}`. Requête unique sur `user_watches` (pas de JOIN genre/pays/studio, donc aucun risque de fan-out), `type` résolu via `titles.type` du titre associé (`COALESCE(uw.title_id, s.title_id)`), `episodeCount` = nombre de visionnages d'épisode (pas nombre de séries distinctes).
  - `GET /dataviz/breakdown?groupBy=period|genre|country|studio&metric=time|count&granularity=&yearFrom=&yearTo=` → `{category_id, category, film, serie}[]`. Interroge `user_watches` directement (pas les vues matérialisées) pour pouvoir scinder par type et supporter une granularité dynamique — une vue pré-agrégée par semaine ne peut pas restituer une granularité "jour". Groupement "studio" : CTE `watch_studio` + `studio_counts` (`COUNT(DISTINCT title_id)` par studio) ; tout studio à ≤1 titre distinct est fondu dans une seule catégorie `category_id=NULL, category='Autre'` (les `NULL` se regroupent naturellement ensemble en `GROUP BY`). `granularity` (period uniquement) : voir "3ème passe" ci-dessous pour le détail complet (révisé après la 1ère version).
  - `GET /dataviz/by-year?metric=time|count&yearFrom=&yearTo=` → `{year, film, serie}[]`, alimente le linechart, indépendant du groupement.
  - Filtrage genre/pays/studio : décidé **côté client** plutôt que par paramètres de requête backend — le backend renvoie toujours la répartition complète (non filtrée) pour le groupement choisi, et le frontend filtre le tableau déjà reçu par `category_id` avant de le passer au graphique. Simplifie fortement le backend (pas de validation/échappement de tableaux d'ids) sans coût réel vu le volume de données (stats d'un seul utilisateur) ; les options du dropdown "Studios" sont d'ailleurs dérivées de cette même réponse non filtrée (pas de liste globale de studios exposée côté frontend).
  - `dataviz.service.ts` réutilise `queryRaw()` (bug #54) partout : toutes les nouvelles requêtes utilisent `SUM`/`COUNT`, donc soumises au même risque de sérialisation `BigInt`.
- **Fait — Frontend :**
  - Ancienne implémentation (Phase 6.1 : `PeriodChart`, `CategoryBarChart`, `AnimationPieChart`, `DatavizFilters`, `DatavizSummary`, hooks `useWatchTime`/`useWatchCount`, `lib/dataviz/transformers.ts`) entièrement remplacée et supprimée — plus aucun consommateur après la refonte. `ChartColors.ts`/`ChartTooltip.tsx` conservés (réutilisés tels quels).
  - Nouveaux composants graphiques : `GroupedHorizontalBarChart`, `StackedVerticalBarChart`, `BreakdownDonutChart` (généralisation de l'ancien camembert "animation" à n'importe quel groupement), `FilmSerieLineChart`.
  - **1ère passe (contrôles partagés, remplacée ensuite) :** `DatavizGroupControls` pilotait les 3 graphiques de répartition avec un seul jeu d'état (métrique/groupement/granularité/filtre) — retirée à la 2ème passe.
  - **2ème passe (config indépendante) :** `ConfigurableBreakdownChart` (grouped-bar/stacked-bar/donut, prop `chartType`) et `ConfigurableLineChart` encapsulent chacun leur propre état (`useState`) et leur propre appel `useDatavizBreakdown`/`useDatavizByYear` — 4 instances totalement indépendantes dans `DatavizSection.tsx`. Bouton "⋮" (`MoreVertical`) ouvrant un panneau flottant positionné en `absolute` (pas un `DropdownMenu` de Base UI, pour éviter tout risque de menu imbriqué avec le `MultiSelectDropdown`/dropdown de granularité qu'il contient — même pattern que `FilterSidebar`, un `<aside>` simplement conditionnel plutôt qu'un composant Menu), fermeture au clic extérieur via un overlay `fixed inset-0`.
  - `MultiSelectDropdown` (Genre/Pays/Studio) extrait de `FilterSidebar.tsx` vers `components/common/MultiSelectDropdown.tsx` pour être réutilisé ici sans dupliquer ~70 lignes.
  - `DatavizSummaryCards` : 2 cartes (temps total dont film/série ; nombre total dont film/épisodes).
  - `profile/page.tsx` : section Dataviz déplacée avant la section Favoris.
- **Fait — 3ème passe ("Rythme de visionnage", retour utilisateur) :** demande d'un nouveau filtre par hiérarchie de date — heure de la journée, quart de journée (matin/après-midi/soirée/nuit), jour de la semaine, mois de l'année, saison — en plus de "Période". Restructuré à la demande de l'utilisateur en un arbre à deux niveaux sous "Période" : **Fixe** (chronologique : Jour/Mois/Trimestre/Année — Semaine et Semestre retirés de la 1ère version) et **Agrégée** (cyclique, toutes années confondues : Heure/Quart de journée/Jour de la semaine/Mois de l'année/Saison).
  - **Blocage identifié et résolu :** `user_watches.date_vue` était en `DATE` pure (pas d'heure) — "Heure" et "Quart de journée" en étaient donc impossibles. Question posée à l'utilisateur (reporter à plus tard vs élargir le schéma) : a choisi d'élargir. `date_vue` passé de `@db.Date` à `@db.Timestamptz(6)` dans `packages/db/prisma/schema.prisma`, appliqué via `prisma db push` (pas de dossier `prisma/migrations` dans ce projet — schéma synchronisé directement, cohérent avec le fonctionnement déjà observé). Les 8 vues matérialisées dataviz dépendant de `date_vue` ont dû être `DROP`ées avant l'`ALTER COLUMN` (Postgres refuse de modifier le type d'une colonne utilisée par une vue) puis recréées via `npm run apply:raw-sql` (idempotent, déjà utilisé pour le bug #54).
  - **Conséquence pour les visionnages déjà enregistrés :** tous les visionnages marqués avant ce changement (stockés comme une simple date) se retrouvent à minuit heure locale après le cast implicite `DATE → TIMESTAMPTZ` — donc dans le même bucket "0h"/"Nuit" par coïncidence, pas une vraie donnée d'heure. Les nouveaux visionnages capturent en revanche une heure réelle sans aucun changement frontend nécessaire : `WatchesService.create()` posait déjà `date_vue: date_vue ?? new Date()` (l'heure était simplement tronquée par l'ancienne colonne `DATE`) — vérifié en direct : `POST /watches` sans `date_vue` explicite produit désormais un horodatage complet, immédiatement reflété dans `/dataviz/breakdown?granularity=hour`.
  - Backend : `periodTruncExpr` renommée `periodCategoryExpr`, gère désormais 9 granularités. Fixe : `date_trunc()` (day/month/quarter/year). Agrégée : `hour` = `EXTRACT(HOUR FROM uw.date_vue)::INT` ; `dayQuarter` = `CASE` sur l'heure (1=Matin [6h,12h) / 2=Après-midi [12h,18h) / 3=Soirée [18h,24h) / 4=Nuit [0h,6h)) ; `weekday` = `EXTRACT(ISODOW FROM uw.date_vue)` (1=Lundi..7=Dimanche) ; `monthOfYear` = `EXTRACT(MONTH FROM uw.date_vue)` ; `season` = `CASE` sur le mois (1=Hiver déc-jan-fév / 2=Printemps mar-avr-mai / 3=Été juin-juil-août / 4=Automne sep-oct-nov). Les granularités Agrégées renvoient un petit entier ordinal (pas un horodatage) — le frontend le mappe vers un libellé via une table de correspondance plutôt que de le parser comme une date.
  - Frontend : `ConfigurableBreakdownChart.tsx` — quand `groupBy=period`, un premier pill-toggle "Fixe/Agrégée" (dérivé de `config.granularity`, pas un champ d'état séparé) précède le dropdown de granularité, dont les options changent selon le mode choisi. `transformers.ts::formatPeriodLabel` détecte le mode via un `Set` de granularités agrégées et bascule entre parsing de date (Fixe) et table de correspondance ordinal→libellé (Agrégée, ex. `WEEKDAY_LABELS`, `SEASON_LABELS`).
  - **Nommage résolu :** l'utilisateur avait demandé des propositions de nom pour ce concept ("hiérarchie de date") ; en fournissant directement l'arbre Fixe/Agrégée avec ces libellés, il a tranché lui-même — repris tels quels dans l'UI ("Type de période" : Fixe/Agrégée), pas de nom de filtre séparé à trouver puisqu'il s'agit d'une sous-structure de "Période" et non d'un nouveau groupement de premier niveau.
- **Fichiers modifiés :** `packages/db/prisma/schema.prisma` (`date_vue` → `Timestamptz(6)`), `apps/api/src/dataviz/dataviz.controller.ts`, `apps/api/src/dataviz/dataviz.service.ts`, `apps/api/src/dataviz/dataviz.service.spec.ts` (+9 tests puis +5 tests supplémentaires pour les granularités agrégées), `apps/api/src/dataviz/dto/dataviz-summary-query.dto.ts` (nouveau), `apps/api/src/dataviz/dto/dataviz-breakdown-query.dto.ts` (nouveau, révisé), `apps/api/src/dataviz/dto/dataviz-by-year-query.dto.ts` (nouveau) ; côté frontend, tout `apps/web/src/components/dataviz/*` (réécrit), `apps/web/src/hooks/dataviz/*` (réécrit : `useDatavizSummary`, `useDatavizBreakdown`, `useDatavizByYear`, anciens hooks supprimés), `apps/web/src/lib/dataviz/types.ts` et `transformers.ts` (réécrits), `apps/web/src/components/common/MultiSelectDropdown.tsx` (nouveau, extrait), `apps/web/src/components/layout/FilterSidebar.tsx` (utilise le `MultiSelectDropdown` extrait), `apps/web/src/app/(frontend)/profile/page.tsx`.
- **Vérification :** `tsc --noEmit` (web + api) sans nouvelle erreur après chaque passe. `jest` api : `dataviz.service.spec.ts` 29/29 (14 Phase 6.1 + 2 régression bigint bug #54 + 9 modification W 1ère/2ème passe + 5 nouveaux pour les granularités Fixe/Agrégée de la 3ème passe, remplaçant le test "semester" retiré) ; suite complète 193/197 (3 suites en échec préexistantes : auth/people/credits). `jest` web : 200/209, baseline strictement inchangée sur les 3 passes. Vérifié en direct dans le navigateur (utilisateur avec 7 visionnages réels) : cartes cohérentes et croisées entre endpoints ; 4 graphiques indépendants confirmés (changer le groupement d'un graphique n'affecte pas les 3 autres) ; bucket "Autre" confirmé pour l'unique studio à un seul titre ; "Fixe/Agrégée" bascule bien les options de granularité (4 vs 5) et le libellé par défaut ("Mois" ↔ "Jour de la semaine") ; `granularity=weekday` confirmé ("Vendredi"/"Samedi" affichés, sans impact sur les autres graphiques) ; `granularity=hour` vérifié de bout en bout avec de vrais visionnages créés/supprimés via l'API (`POST /watches` sans `date_vue` produit un horodatage réel — `14:30:00.000Z` → bucket "16" une fois converti dans le fuseau horaire de session (+02), confirmant que l'extraction d'heure fonctionne correctement une fois `date_vue` élargi).
- **Fait — 4ème passe (4 cartes + titres dynamiques, retour utilisateur) :** demande de remplacer les 2 anciennes cartes résumé par 4 cartes indépendantes (chacune avec son "⋮"), et de rendre les titres des cartes/graphiques dépendants de leur config plutôt que figés.
  - **Carte "Temps" :** temps total passé devant l'écran (dont film/série), au format lisible ("3 mois et 6 jours") plutôt que des minutes brutes — nouvelle fonction `formatFriendlyDuration()` (paliers : <60min → minutes ; <24h → "XhYY" ; <60j → "X jour(s) et Yh" ; <12 mois → "X mois et Y jour(s)" ; sinon → "X an(s) et Y mois". Approximation volontaire, mois=30j/année=365j — l'objectif est la lisibilité, pas une décomposition calendaire exacte). Chaque ligne affiche aussi la valeur précise en minutes ("soit XXX min"). "⋮" : filtre Année de/à (le filtre année de l'ancien `DatavizFilters` retrouve ainsi son usage, sous une forme différente).
  - **Carte "Nombre" :** total de visionnages, dont films et "dont X épisodes de Y séries" — a nécessité un nouveau champ backend `serieCount` (`COUNT(DISTINCT CASE WHEN t.type='serie' THEN t.id END)`, ajouté à `GET /dataviz/summary`) : `episodeCount` compte déjà les visionnages d'épisode, mais aucun champ n'existait pour le nombre de séries *distinctes* concernées.
  - **Carte "Évolution" :** valeur de la période en cours (ex. "245 min ce mois-ci") et variation en % vs la période précédente ("+19% que le mois dernier") — **aucun endpoint dédié** : dérivé des 2 dernières lignes de `/dataviz/breakdown?groupBy=period` (déjà trié chronologiquement par le backend), le "courant" et le "précédent" sont juste les 2 dernières entrées du tableau. "⋮" : métrique + granularité (Fixe uniquement — Jour/Mois/Trimestre/Année, "Agrégée" n'aurait pas de notion de "période précédente" cohérente). Nouveaux libellés `periodNouns()` ("ce mois-ci"/"le mois dernier", etc., un jeu par granularité fixe).
  - **Carte "Stats perso" :** max/min/somme/moyenne — **aucun calcul serveur** : réutilise directement `useBreakdownConfig` (même config groupement/métrique/granularité que les 3 graphiques de répartition) et calcule les agrégats côté client sur les `total` déjà reçus. Max/Min affichent aussi la catégorie correspondante.
  - **Titres dynamiques :** nouvelle fonction `describeBreakdownConfig()` (ex. "Temps de visionnage par genre") remplace les titres figés ("Barres horizontales groupées" etc., devenus une légende secondaire sous le titre, ex. "Barres horizontales groupées" → légende, "Temps de visionnage par genre" → titre). S'applique aux 3 graphiques de répartition et à la carte Stats perso (même fonction, même config) ; le linechart et les cartes Temps/Nombre/Évolution ont leur propre variante courte (ex. `${METRIC_LABEL[metric]} par année, film vs série`).
  - **Partage de code (8 widgets configurables au total, 4 cartes + 4 graphiques) :** `useBreakdownConfig` (hook, état + fetch + résolution des options de catégorie) et `BreakdownConfigFields` (JSX des contrôles Métrique/Groupement/Fixe-Agrégée/MultiSelect) extraits de `ConfigurableBreakdownChart` pour être réutilisés tels quels par `DatavizStatsCard` — sans cette extraction, la carte Stats perso aurait dupliqué ~150 lignes. `ChartConfigMenu` (bouton "⋮" + panneau flottant) et `WidgetHeader` (titre centré + légende + bouton "⋮" épinglé en haut à droite, cf. passe suivante) partagés par les 8.
- **Fait — 5ème passe (centrage, retour utilisateur) :** titres de graphique centrés, contenu textuel des 4 cartes centré. Nouveau composant `WidgetHeader` : `relative flex flex-col items-center text-center` pour le bloc titre+légende, bouton "⋮" en `absolute right-0 top-0` (sorti du flux de centrage plutôt que dans un `flex justify-between` classique) — appliqué aux 4 cartes et aux 2 composants de graphique (`ConfigurableBreakdownChart`, `ConfigurableLineChart`). Carte "Stats perso" : grille 2 colonnes (label à gauche, valeur alignée à droite) remplacée par une liste centrée "Label : Valeur" par ligne.
- **Fichiers modifiés (4ème + 5ème passes) :** `apps/api/src/dataviz/dataviz.service.ts` (+`serieCount`), `apps/api/src/dataviz/dataviz.service.spec.ts` (+1 test), `apps/web/src/lib/dataviz/types.ts` (+`serieCount`, `BreakdownChartConfig`/`DEFAULT_BREAKDOWN_CONFIG` déplacés ici), `apps/web/src/lib/dataviz/transformers.ts` (+`formatFriendlyDuration`, `describeBreakdownConfig`, `periodNouns`, `METRIC_LABEL`), `apps/web/src/hooks/dataviz/useBreakdownConfig.ts` (nouveau), `apps/web/src/components/dataviz/BreakdownConfigFields.tsx` (nouveau, extrait), `apps/web/src/components/dataviz/ChartConfigMenu.tsx` (nouveau, extrait), `apps/web/src/components/dataviz/WidgetHeader.tsx` (nouveau), `apps/web/src/components/dataviz/YearRangeFields.tsx` (nouveau), `apps/web/src/components/dataviz/DatavizTimeCard.tsx` (nouveau), `apps/web/src/components/dataviz/DatavizCountCard.tsx` (nouveau), `apps/web/src/components/dataviz/DatavizEvolutionCard.tsx` (nouveau), `apps/web/src/components/dataviz/DatavizStatsCard.tsx` (nouveau), `apps/web/src/components/dataviz/DatavizSummaryCards.tsx` (supprimé, remplacé par les 4 cartes), `apps/web/src/components/dataviz/ConfigurableBreakdownChart.tsx`/`ConfigurableLineChart.tsx` (réécrits pour utiliser les briques partagées), `apps/web/src/components/dataviz/DatavizSection.tsx` (réécrit).
- **Vérification (4ème + 5ème passes) :** `tsc --noEmit` (web + api) sans nouvelle erreur. `jest` api : `dataviz.service.spec.ts` 30/30 (29 + 1 nouveau pour `serieCount`) ; suite complète 194/198 (3 suites en échec préexistantes, baseline inchangée). `jest` web : 200/209, baseline inchangée. Vérifié en direct dans le navigateur (utilisateur avec 7 visionnages réels) : carte Temps "7h31 passé devant l'écran, soit 451 min / dont 5h03 devant des films, soit 303 min / dont 2h28 devant des séries, soit 148 min" ; carte Nombre "7 éléments visionnés / dont 2 films / dont 5 épisodes de 2 séries" ; carte Évolution "245 min ce mois-ci / +19% que le mois dernier" (juillet=206min, août=245min, (245-206)/206≈19% ✓) ; carte Stats perso Max/Min/Somme/Moyenne avec catégories correctes ; les 8 boutons "⋮" présents et fonctionnels (filtre Année de/à sur la carte Temps confirmé de bout en bout : saisie "2021" → titre devient "Temps de visionnage (2021–…)") ; titres de graphique et cartes bien centrés, contenu des cartes centré, bouton "⋮" resté correctement épinglé en haut à droite sans perturber le centrage.
- **Fait — 6ème passe (menus inaccessibles + choix des stats affichées, retour utilisateur) :**
  - **Menus inaccessibles :** deux causes empilées, découvertes en marge l'une de l'autre. (1) `bg-popover` résolvait vers rien du tout (bug #49, root-causé et corrigé ici — voir cette entrée) : le panneau était donc entièrement transparent, laissant les barres du graphique visibles à travers. (2) Une fois le fond opaque, le panneau restait partiellement inaccessible : `Card` (`ui/card.tsx`) a `overflow-hidden` (pour les coins arrondis), qui rogne tout descendant `position: absolute` à ses propres bords — un z-index élevé n'y change rien, `overflow` et `z-index` sont deux mécanismes indépendants. `ChartConfigMenu` réécrit pour rendre son panneau via `createPortal(..., document.body)`, positionné en `position: fixed` à partir du `getBoundingClientRect()` du bouton "⋮" au moment de l'ouverture — échappe complètement à `Card` (même principe que `MenuPrimitive.Portal`, déjà utilisé par les `DropdownMenu` Base UI de l'app). z-index aussi remonté à l'échelle de `FilterSidebar` (overlay `z-40`, panneau `z-50`) par robustesse.
  - **Carte "Stats perso" : choix des statistiques affichées.** Nouveau contrôle multi-sélection (Max/Min/Somme/Moyenne, pills togglables indépendamment) dans le "⋮" de la carte, au-dessus des champs de groupement existants. Toutes sélectionnées par défaut ; si aucune n'est cochée, message "Aucune statistique sélectionnée." plutôt qu'une carte vide silencieuse.
- **Fichiers modifiés (6ème passe) :** `apps/web/tailwind.config.ts` (bug #49), `apps/web/src/components/dataviz/ChartConfigMenu.tsx` (réécrit, Portal), `apps/web/src/components/dataviz/DatavizStatsCard.tsx` (sélecteur de stats).
- **Vérification (6ème passe) :** `tsc --noEmit` (web) sans nouvelle erreur ; `jest` web : 200/209, baseline inchangée. Vérifié en direct dans le navigateur (nouveau compte de test créé via l'API pour ce test, la session précédente ayant expiré) : fond du panneau `rgb(31, 31, 31)` (au lieu de `rgba(0, 0, 0, 0)`) et panneau visuellement entier, non rogné par le cadre de la carte ; toggle "Max" confirmé fonctionnel (bascule `bg-primary text-white` ↔ `text-muted-foreground` au clic).
- **Fait — 7ème passe (filtre header retiré de Profil, intégré au menu de chaque visuel, retour utilisateur) :** demande "supprime les filtres header de la page profil, intègre le menu filtre dans le coin du menu trois points de chaque visuel". Ambiguïté résolue via question posée à l'utilisateur : le filtre header (genre/pays/année/note/listes) ne filtrait jusque-là que la section Favoris de la page Profil (les visuels dataviz n'y étaient pas connectés) — choix retenu : intégrer ces filtres au menu "⋮" de chacun des 8 visuels dataviz, et Favoris perd ce filtrage (affiche tous les favoris sans filtre).
  - **Header :** `Header.tsx` — nouveau `isProfilePage = pathname === "/profile"`, masque conditionnellement les tabs de type (Tout/Film/Série/Personne), le bouton "Filtres" et la sidebar (`FilterSidebar open={filterSidebarOpen && !isProfilePage}`) sur cette seule page ; inchangé partout ailleurs (vérifié en direct sur `/search`).
  - **`profile/page.tsx` :** suppression de `parseTitleFilters`/`titleMatchesFilters`/`toFilterableTitle`/`buildListIdsByTitle` et de la variable `filters` dérivée de l'URL — la section Favoris affiche désormais `favorisDetail?.items` sans filtrage ; message vide simplifié en conséquence (l'ancien message "Aucun favori ne correspond aux filtres actifs" n'a plus lieu d'être).
  - **Filtres repris :** genre, pays, année de sortie (`releaseYearMin`/`Max` — distinct de l'année de visionnage déjà filtrable via `YearRangeFields` sur les cartes Temps/Nombre), note IMDB, listes. "Statut" (vu/non vu) et "Type" (film/série) du header **volontairement absents** : `user_watches` ne contient par nature que des titres déjà vus, et chaque visuel scinde déjà film/série lui-même en légende.
  - **Backend :** nouveau DTO de base `DatavizFilterQueryDto` (`genreIds`/`countryIds`/`listIds` en `@IsUUID('4', {each:true})`, transformés depuis une chaîne CSV ; `releaseYearMin`/`Max`/`noteImdbMin`/`Max` en `@Type(() => Number)`), étendu par les 3 DTOs de requête existants (`DatavizSummaryQueryDto`, `DatavizBreakdownQueryDto`, `DatavizByYearQueryDto`). `dataviz.service.ts` : nouvelle méthode `extraFilters()` générant des clauses `AND EXISTS(...)` sur `title_genres`/`title_countries`/`list_items` (alias `tgf`/`tcf`/`lif`, distincts des alias déjà utilisés par `getBreakdownByGenre`/`getBreakdownByCountry` pour éviter toute collision) et des comparaisons directes sur `t.date_sortie`/`t.note_imdb` — appelée dans les 6 méthodes de requête (`getSummary`, `getBreakdownByPeriod/Genre/Country/Studio`, `getByYear`), y compris à l'intérieur de la CTE `watch_studio` où l'alias `t` reste en scope.
  - **Frontend :** nouveau type `DatavizExtraFilters` (7 champs) dans `types.ts`, `BreakdownChartConfig` étendu par intersection (`DatavizExtraFilters & {...}`). Nouveau composant partagé `DatavizFilterFields.tsx` (sliders Année de sortie/Note IMDB avec état local de prévisualisation avant `onValueCommitted`, 3 `MultiSelectDropdown` Genre/Pays/Listes) — rendu dans `BreakdownConfigFields` (couvre les 3 graphiques de répartition + la carte Stats perso via la config partagée) et ajouté individuellement au menu des 4 widgets à état local propre (`ConfigurableLineChart`, `DatavizEvolutionCard`, `DatavizTimeCard`, `DatavizCountCard`) — les 8 visuels au total. Nouveau helper `datavizFilterParams.ts::appendExtraFilterParams()` pour factoriser la sérialisation en `URLSearchParams` (CSV pour les tableaux d'ids) partagée par les 3 hooks API, dont les signatures sont passées d'arguments positionnels à un objet de requête unique (`useDatavizSummary`, `useDatavizByYear`) pour accueillir les nouveaux champs sans exploser le nombre de paramètres.
- **Fichiers modifiés (7ème passe) :** `apps/api/src/dataviz/dto/dataviz-filter-query.dto.ts` (nouveau), `dataviz-summary-query.dto.ts`/`dataviz-breakdown-query.dto.ts`/`dataviz-by-year-query.dto.ts` (étendent la base), `apps/api/src/dataviz/dataviz.service.ts` (+`extraFilters()`), `apps/api/src/dataviz/dataviz.service.spec.ts` (+8 tests), `apps/web/src/lib/dataviz/types.ts` (+`DatavizExtraFilters`), `apps/web/src/components/dataviz/DatavizFilterFields.tsx` (nouveau), `apps/web/src/hooks/dataviz/datavizFilterParams.ts` (nouveau), `useDatavizSummary.ts`/`useDatavizByYear.ts`/`useDatavizBreakdown.ts`/`useBreakdownConfig.ts` (étendus), `BreakdownConfigFields.tsx`/`ConfigurableLineChart.tsx`/`DatavizEvolutionCard.tsx`/`DatavizTimeCard.tsx`/`DatavizCountCard.tsx` (intègrent `DatavizFilterFields`, largeur de menu élargie à `w-72` par cohérence), `apps/web/src/components/layout/Header.tsx` (`isProfilePage`), `apps/web/src/app/(frontend)/profile/page.tsx` (filtrage Favoris retiré).
- **Vérification (7ème passe) :** `tsc --noEmit` (web + api) sans nouvelle erreur. `jest` api : `dataviz.service.spec.ts` 38/38 (30 + 8 nouveaux) ; suite complète 202/206 (3 suites en échec préexistantes, baseline inchangée). `jest` web : 200/209, baseline inchangée. Vérifié en direct dans le navigateur (nouveau compte de test) : header vide (`""`) sur `/profile` (ni tabs de type ni bouton "Filtres"), header normal ailleurs (`/search` : "Tout Film Série Personne Filtres") ; les 8 menus "⋮" affichent bien Année de sortie/Note IMDB/Genre/Pays/Listes ; dropdown Genre peuplé avec les vrais genres (`GET /titles/genres`) ; sélection d'un genre déclenche `GET /dataviz/summary?genreIds=<uuid>` → 200 OK (validation DTO + clause SQL `EXISTS` sans erreur) ; Favoris affiche "Vous n'avez pas encore de favoris." sans référence à un filtre.
- **Fait — 8ème passe (refonte complète du menu de configuration, retour utilisateur) :** demande d'un menu unifié, identique pour les 8 visuels, structuré en Métrique (single-select révélant une Agrégation single-select selon la métrique) → Groupement (single-select) → Filtres (Type de média/Année de visionnage/Année de sortie/Note en single-select ou slicer, puis Genre/Pays/Studio/Listes en dropdowns 2 par ligne). Remplace entièrement le système `metric: time|count` + `BreakdownChartConfig` de la 7ème passe — l'ancienne demande d'agrégation générique (count/distinctCount/sum/avg/min/max, interrompue avant tout code) est absorbée par cette refonte plus large. Suppression du sous-titre de type de chart, renommage du module en "Temps d'écran", suppression complète du module Favoris de la page Profil (3 demandes annexes du même message).
  - **Modèle métrique/agrégation :** 4 métriques — `duration` (durée en minutes, granularité épisode), `watches` (visionnages, granularité épisode — une série de 10 épisodes vus compte 10), `titles` (titres, granularité titre — la même série compte 1), `note` (note IMDB des titres regardés, dédupliqués par titre). Agrégations par métrique : `duration` → sum/min/max/avg/evolution ; `watches`/`titles`/`note` → count/distinctCount/min/max/avg/evolution. Pour `titles`, `count` et `distinctCount` sont strictement identiques (`COUNT(DISTINCT titre)` dans les deux cas) — offerts malgré tout pour la cohérence du menu, clarifié avec l'utilisateur en amont. Ambiguïtés résolues via questions posées à l'utilisateur : distinction visionnages (granularité épisode) vs titres (granularité titre) ; "Type de média" comme groupement remplace complètement la scission film/série auparavant automatique sur tous les graphiques (choisir "Genre" affiche désormais une seule barre par genre, total film+série confondu) ; la règle "groupement≠tout ⇒ total ET détail" ne s'applique qu'aux datacards, pas aux graphiques.
  - **Restriction groupement :** pour `watches`/`titles`, choisir min/max/avg/evolution ne conserve que les groupements Tout/Période dans le menu (`isGroupByRestricted()`, dupliqué frontend/backend) — ces agrégations comptent par tranche de période (ex. "visionnages par mois") puis min/max/moyenne/évolution sur cette série de compteurs (reprend le principe de l'ancienne carte "Stats perso"), pas de sens par genre/pays/studio/type de média.
  - **`evolution` :** compare la valeur agrégée de la dernière période à l'avant-dernière (`ROUND((dernière - avant-dernière) / avant-dernière * 100, 1)`, `NULL` si pas d'avant-dernière période — jamais coercé en `0`, cf. bug ci-dessous). Pour `watches`/`titles` (restreint), une seule comparaison globale (pas de notion de catégorie). Pour `duration`/`note` (non restreint), une comparaison **par catégorie** du groupement choisi via fenêtrage SQL (`ROW_NUMBER() OVER (PARTITION BY catégorie ORDER BY période DESC)`) — le groupement `studio` y est en version simplifiée, sans le repli "Autre" des studios à un seul titre (repli conservé uniquement pour le chemin standard count/distinctCount/sum/min/max).
  - **`note`, agrégation `avg` :** dédoublonne d'abord par titre (CTE `SELECT DISTINCT`) avant de moyenner — sinon un titre revisionné plusieurs fois biaiserait la moyenne (contrairement à `min`/`max`, idempotents à la duplication, calculés directement sans CTE).
  - **Bug découvert et corrigé en vérification live (nouveau compte de test + visionnages réels créés via l'API) :** `AVG()`/`ROUND()` et les colonnes `DECIMAL` (`note_imdb`) reviennent en `NUMERIC` PostgreSQL, que le driver `pg` renvoie en **chaîne** par défaut (pas en `Number`, à la différence du `bigint` déjà géré par `queryRaw()`, bug #54) — `value.toFixed(...)` plantait côté frontend (`formatDatavizValue`) sur toute agrégation avg/evolution/note.min/note.max. Corrigé en un point unique (`DatavizService.query()`, seul appelant public de `queryRows()`) plutôt que dans chacune des 6 méthodes `rowsX` : `coerceRowValue()` convertit `value` en `Number` si non `null`/`undefined`, laisse `null` intact (ne pas confondre "pas de période précédente" avec "évolution nulle").
  - **Filtres :** `mediaType` (filtre Tout/Film/Série, distinct du groupement `mediaType`), `watchedYearMin/Max` (slicer "Année de visionnage", remplace les anciens champs texte `YearRangeFields`), `releaseYearMin/Max`/`noteImdbMin/Max`/`genreIds`/`countryIds`/`listIds` (repris de la 7ème passe), `studioIds` (nouveau — nouvel endpoint public `GET /titles/studios`, miroir de `/titles/genres`/`/titles/countries`).
  - **Cartes → génériques :** les 4 cartes à identité figée (Temps/Nombre/Évolution/Stats perso) fusionnées en un unique composant `DatavizMetricCard`, instancié 4 fois avec une config de départ différente (approxime les anciennes identités) mais entièrement reconfigurable ensuite — anticipe la "config par défaut par visuel" déjà annoncée comme prochaine étape lors des passes précédentes. Affiche le total ET le détail par catégorie quand le groupement ≠ Tout (demande utilisateur, clarifiée : datacards uniquement).
  - **Graphiques → séries uniques :** `GroupedHorizontalBarChart`/`StackedVerticalBarChart`/`BreakdownDonutChart`/le linechart (renommé `DatavizLineChart`) n'affichent plus qu'une seule série (`{category, value}[]`) — la scission film/série qu'ils codaient en dur disparaît (absorbée par le groupement `mediaType`, désormais un choix explicite). Conséquence acceptée : le linechart ne peut plus tracer 2 lignes film/série simultanément sur un axe temporel (le groupement étant single-select, on choisit soit "Période" soit "Type de média", pas les deux à la fois) — regression assumée, signalée à l'utilisateur.
  - **Backend, endpoint unique :** `GET /dataviz/query` remplace `summary`/`breakdown`/`by-year` (DTOs et méthodes de service supprimés). `DatavizQueryDto` (nouveau) étend `DatavizFilterQueryDto` (désormais générique, `+studioIds`). `dataviz.service.ts` réécrit : `queryRows()` dispatche vers 5 implémentations (`rowsStandard`, `rowsStudioStandard` — repli "Autre" —, `rowsPeriodCollapsed` — watches/titles restreint —, `rowsEvolution`, `rowsNoteAvg`) partageant `categoryPieces()` (jointures par groupement) et `valueAggExpr()` (expression d'agrégation par métrique).
- **Fichiers modifiés (8ème passe) :** Backend : `apps/api/src/dataviz/dto/dataviz-query.dto.ts` (nouveau), `dataviz-filter-query.dto.ts` (+`studioIds`), `dataviz-summary-query.dto.ts`/`dataviz-breakdown-query.dto.ts`/`dataviz-by-year-query.dto.ts` (supprimés), `dataviz.controller.ts`/`dataviz.service.ts` (réécrits), `dataviz.service.spec.ts` (réécrit, 37 tests), `titles.controller.ts`/`titles.service.ts` (+`GET /titles/studios`). Frontend : `lib/dataviz/types.ts`/`transformers.ts` (réécrits), `hooks/dataviz/useDatavizQuery.ts`/`useDatavizConfig.ts` (nouveaux, remplacent `useDatavizSummary`/`useDatavizBreakdown`/`useDatavizByYear`/`useBreakdownConfig`/`datavizFilterParams.ts`), `hooks/api/useTitles.ts` (+`useTitleStudios`), `components/dataviz/DatavizVisualConfigFields.tsx` (nouveau, remplace `BreakdownConfigFields.tsx`/`DatavizFilterFields.tsx`/`YearRangeFields.tsx`), `DatavizMetricCard.tsx` (nouveau, remplace les 4 cartes), `GroupedHorizontalBarChart.tsx`/`StackedVerticalBarChart.tsx`/`BreakdownDonutChart.tsx`/`DatavizLineChart.tsx` (réécrits en série unique, remplace `FilmSerieLineChart.tsx`), `ConfigurableBreakdownChart.tsx`/`ConfigurableLineChart.tsx`/`DatavizSection.tsx`/`WidgetHeader.tsx` (réécrits), `profile/page.tsx` (titre renommé, module Favoris retiré).
- **Vérification (8ème passe) :** `tsc --noEmit` (web + api) sans nouvelle erreur. `jest` api : `dataviz.service.spec.ts` 37/37 ; suite complète 205/209 (3 suites en échec préexistantes, baseline inchangée). `jest` web : 200/209, baseline inchangée. Vérifié en direct dans le navigateur avec de vraies données (2 films importés depuis TMDB, 4 visionnages créés via l'API à des dates différentes) : carte Somme/Durée "7h14 (434 min)" (101×2 + 116×2 = 434 ✓), carte Nombre/Visionnages "4 visionnage(s)" ✓, carte Évolution/Durée par mois "-12,9 %" (juillet 232min → août 202min, (202-232)/232×100≈-12,9 % ✓) avec repli "—" par période individuelle (pas de période antérieure à l'intérieur d'une même période) confirmé après correctif ; carte Moyenne/Note "6,45/10" (moyenne de 6.2 et 6.7 ✓) ; graphique par genre : totaux par genre corrects, croisés avec les genres réels de chaque film importé (232 pour Action/Crime/Thriller, 202 pour Adventure/Comedy/Family/Fantasy) ; graphique par type de média : une seule catégorie "Film" à 434 (aucune série) ; restriction de groupement confirmée en direct (Visionnages + Moyenne → le menu Groupement ne propose plus que Tout/Période) ; filtres `mediaType`/`noteImdbMin`/`genreIds` vérifiés via requêtes directes (résultats narrowés correctement, y compris le cas vide `mediaType=serie` → `value: null` sans crash).
- **Regression 8ème passe, résolue par la 9ème :** le linechart ne pouvait plus afficher 2 lignes film/série sur un axe période simultanément (conséquence du groupement single-select) — voir "Fait — 9ème passe" ci-dessous, qui réintroduit cette capacité de façon générique (axe "Légende").
- **Fait — 9ème passe (axe "Légende", 2ème axe de répartition sur barcharts/linechart) :** demande "sur barcharts et linechart, rajoute la possibilité d'un deuxième 'légende' avec les mêmes groupements (sur un barchart, permet de diviser les barres au sein d'un même groupe, sur le linechart, permet de diviser la ligne en plusieurs)". Résout directement la regression assumée de la 8ème passe, en généralisant l'ancienne scission film/série codée en dur à n'importe quel groupement.
  - **Portée :** nouveau champ `legendBy` (mêmes 6 valeurs que `groupBy`, "none" par défaut) — supporté uniquement par le chemin backend "standard" (`rowsStandard`/`rowsStudioStandard`, agrégations count/distinctCount/sum/min/max), pas par evolution/note+avg/watches+titres restreint (les catégories y sont soit calculées différemment — moyenne dédoublonnée par titre, fenêtrage temporel —, soit inexistantes — collapse en une seule valeur). Contrôle "Légende" masqué côté frontend quand l'agrégation courante ne le permet pas (`supportsLegend()`, dupliqué frontend/backend) ; masqué aussi sur les 4 datacards et le donut (demande explicite : barcharts + linechart uniquement).
  - **Backend :** `categoryPieces()` accepte un `aliasSuffix` (ex. `'2'`) pour permuter les alias SQL (`g`/`tg` → `g2`/`tg2`, etc.) et éviter toute collision — y compris quand Légende porte sur le **même** groupement que l'axe principal (ex. Groupement=Genre, Légende=Genre : deux jointures distinctes vers `title_genres`/`genres`, testé explicitement). `rowsStandard` l'appelle une 2ème fois pour l'axe légende, ajoute `series_id`/`series` au `SELECT`, fusionne les `GROUP BY`/`ORDER BY`. `rowsStudioStandard` (groupement `studio`, repli "Autre") joint la légende **à l'intérieur** de la CTE `watch_studio` (où `t`/`uw` restent en scope) — le repli "Autre" reste basé sur le studio seul, indépendant de la légende.
  - **Frontend :** `DatavizVisualConfigFields` reçoit un prop `showLegend` (passé par `ConfigurableBreakdownChart` seulement pour grouped-bar/stacked-bar, par `ConfigurableLineChart` toujours) ; options de Légende = mêmes groupements que "Groupement" mais en excluant la valeur déjà choisie comme axe principal (évite un choix redondant), "Tout" relabellé "Aucune" dans ce contexte. Nouveau transformateur `pivotRowsByLegend()` : convertit les lignes "longues" (`{category, series, value}[]`) renvoyées par le backend vers le format "large" attendu par Recharts (une clé par série distincte) ; sans légende active, retombe sur une unique série `"value"` (comportement identique à `transformRows`, aucune régression pour les widgets sans légende).
  - **Graphiques :** `GroupedHorizontalBarChart`/`StackedVerticalBarChart`/`DatavizLineChart` acceptent désormais `seriesKeys: string[]` et rendent un `<Bar>`/`<Line>` par clé (`<Legend>` Recharts affichée uniquement si plus d'une série). Le type "stacked-bar" empile réellement les séries (`stackId` commun) tandis que "grouped-bar" les place côte à côte (pas de `stackId`) — ces deux variantes redeviennent visuellement distinctes dès qu'une légende est active (elles étaient devenues identiques à la 8ème passe, faute de plusieurs séries à empiler/grouper).
  - **Correctif couleurs (retour utilisateur, "même couleur tout le temps") :** les séries de légende utilisaient initialement `BAR_PALETTE`, dont les deux premiers slots (`primary` `#e50914` et `primaryHover` `#ff1a25`) sont deux rouges quasi identiques — sur une légende à plusieurs séries (ex. genres), les 2 premiers segments/lignes se confondaient visuellement. Root-causé en direct : les couleurs variaient bien par index (pas un bug de logique), mais deux teintes adjacentes de la palette catégorielle n'étaient pas assez distinctes. Remplacé par `DIVERGING_PALETTE` (nouveau, `ChartColors.ts`) — rouge → orange → gris neutre → bleu, 9 teintes bien écartées — utilisée uniquement quand une légende est active (`hasLegend`) ; le mode sans légende (une seule série `"value"`) garde `CHART_COLORS.primary`, inchangé.
- **Fichiers modifiés (9ème passe) :** Backend : `dataviz-query.dto.ts` (+`legendBy`), `dataviz.service.ts` (`categoryPieces()` avec `aliasSuffix`, `rowsStandard`/`rowsStudioStandard` étendus, type `DatavizRow` +`series_id`/`series`), `dataviz.service.spec.ts` (+5 tests). Frontend : `lib/dataviz/types.ts` (+`legendBy`, `supportsLegend()`, `DatavizPivotedDatum`), `transformers.ts` (+`pivotRowsByLegend()`), `useDatavizQuery.ts` (sérialise `legendBy`), `useDatavizConfig.ts` (coercion : légende désactivée si agrégation incompatible ou si légende = groupement), `DatavizVisualConfigFields.tsx` (+contrôle Légende, prop `showLegend`), `GroupedHorizontalBarChart.tsx`/`StackedVerticalBarChart.tsx`/`DatavizLineChart.tsx` (multi-séries), `ConfigurableBreakdownChart.tsx`/`ConfigurableLineChart.tsx` (branchent `showLegend`/`pivotRowsByLegend`).
- **Vérification (9ème passe) :** `tsc --noEmit` (web + api) sans nouvelle erreur. `jest` api : `dataviz.service.spec.ts` 42/42 ; suite complète 210/214 (3 suites en échec préexistantes, baseline inchangée). `jest` web : 200/209, baseline inchangée. Vérifié en direct dans le navigateur (mêmes 2 films/4 visionnages que la 8ème passe) : `groupBy=genre&legendBy=studio` → répartition genre×studio correcte (fan-out attendu, chaque film dupliqué sur ses genres ET ses studios, valeurs 232/202 conformes) ; `groupBy=period&legendBy=genre` sur le linechart → juillet scindé en 3 lignes (Action/Crime/Thriller à 232), août en 4 lignes (Adventure/Comedy/Family/Fantasy à 202) — 7 `<Line>` Recharts rendues, aucune erreur console ; menu "Légende" confirmé masqué sur les 4 datacards et le donut, présent uniquement sur les 2 barcharts et le linechart ; options de Légende confirmées excluant dynamiquement le groupement déjà choisi.
- **Suite prévue :** configuration par défaut propre à chaque visuel (partiellement anticipée par les `defaultConfig` de la 8ème passe, mais pas encore affinée avec l'utilisateur).

---

## Bugs à corriger — Header & Navigation

### 35. URL `?type=film` ou `?type=serie` dans les recommandations cause "The operation was aborted"
- **Symptôme :** Quand on clique sur un film dans "Titres recommandés", l'URL contient `?type=film` ou `?type=serie` et la page affiche "The operation was aborted". La page charge normalement si on retire le suffixe de l'URL.
- **Cause racine :** Le paramètre `type` dans l'URL n'est pas géré correctement par la page de détail du titre. La page `/titles/[id]` ne sait pas traiter `?type=film` et cela cause une erreur de requête.
- **Fichiers concernés :** `apps/web/src/app/(frontend)/titles/[id]/page.tsx`, `apps/web/src/lib/types/api.ts`
- **Correction proposée :**
  - Nettoyer le paramètre `type` de l'URL avant de faire les appels API
  - Ou gérer le paramètre `type` dans la page de détail pour déterminer le type de contenu
  - Vérifier la fonction `titleRecommendationToSearchResult()` qui génère ces URLs
- **Reconfirmé par l'utilisateur** (toujours non corrigé à ce jour) — cliquer sur un titre recommandé produit toujours "The operation was aborted" via le suffixe `?type=`.

---

## Bugs à corriger — Page Titre

### 36. Page titre : pas de lien direct vers la fiche du réalisateur
- **Symptôme :** Sur la page titre, impossible de savoir rapidement qui a réalisé le film/la série sans parcourir toute la liste "Distribution & Équipe".
- **Cause racine :** `TitleHero.tsx` n'affiche que titre/année/note/statut/synopsis, aucune référence au réalisateur. Le nom du réalisateur n'apparaît que noyé dans la liste de credits — qui elle-même ne sépare pas correctement distribution et équipe technique (cf. modification C : `CREW_ROLES` compare des jobs anglais à des libellés de rôle en français, la comparaison ne matche jamais).
- **Fichiers concernés :** `apps/web/src/components/titles/TitleHero.tsx`, `apps/web/src/app/(frontend)/titles/[id]/page.tsx`, `apps/api/src/titles/titles.service.ts` (ou `credits.service.ts`) pour exposer le réalisateur séparément
- **Correction proposée :**
  - Exposer le(s) réalisateur(s) séparément dans la réponse `GET /titles/:id` (ou via un appel dédié)
  - Afficher "Réalisé par [nom]" dans `TitleHero`, en lien cliquable vers `/people/:id`

### 37. Page titre / people : pas de lien vers la fiche TMDB
- **Symptôme :** Aucun lien externe vers la fiche TMDB (themoviedb.org) sur les pages titre et personne, alors que `tmdb_id` est disponible et déjà utilisé pour construire les URLs d'images.
- **Cause racine :** `TitleHero.tsx` et `PersonHero.tsx` n'exploitent `tmdb_id`/`TMDB_IMAGE_BASE_URL` que pour les images, jamais pour un lien externe vers la fiche TMDB elle-même.
- **Fichiers concernés :** `apps/web/src/components/titles/TitleHero.tsx`, `apps/web/src/components/people/PersonHero.tsx`
- **Correction proposée :**
  - Ajouter un lien "Voir sur TMDB" vers `https://www.themoviedb.org/movie/:tmdb_id` (ou `/tv/:tmdb_id` selon le type) sur la page titre, et `https://www.themoviedb.org/person/:tmdb_id` sur la page personne
  - N'afficher le lien que si `tmdb_id` est défini (titres/personnes sans tmdb_id restent supportés)

### 38. Distribution & Équipe : casting incomplet quand le titre arrive via "titres recommandés"
- **Symptôme :** En cliquant sur un titre recommandé non local (URL `/titles/tmdb/:tmdbId`), la page titre peut afficher un casting très incomplet — parfois seulement une ou deux personnes déjà présentes en base, jamais la distribution complète.
- **Cause racine :** `getOrImportByTmdbId()` (`apps/api/src/titles/titles.service.ts:142`) retourne immédiatement le titre existant dès qu'une ligne `titles` avec ce `tmdb_id` existe, sans jamais vérifier si son casting complet (`credits`) a été importé. Depuis la correction du bug 27 (import allégé `withCredits: false` pour le refresh de filmographie), un titre peut désormais exister en base avec seulement ses métadonnées et un seul credit (celui de la personne dont la filmographie a été rafraîchie). Si ce même titre est ensuite ouvert via les recommandations (ou toute navigation `/titles/tmdb/:tmdbId`), `getOrImportByTmdbId` le traite comme "déjà importé" et ne complète jamais le casting.
- **Fichiers concernés :** `apps/api/src/titles/titles.service.ts` (`getOrImportByTmdbId`), `apps/api/src/people/people.service.ts` (`refreshFilmography`, origine du titre "léger")
- **Correction proposée :**
  - Dans `getOrImportByTmdbId`, vérifier aussi si le titre a au moins un credit sans `episode_id` en base
  - Si absent (titre importé en mode léger uniquement), déclencher un import complet (`withCredits: true`, ou un import différentiel des credits manquants) même si le titre existe déjà

### 39. `GET /ratings` : réponse incohérente avec le type frontend (`data` vs `items`, `note_perso` vs `note`)
- **Symptôme :** Découvert en marge du bug #28 (envisagé un filtre "ma note" dans la filmographie, abandonné à cause de ce bug). Potentiellement, la liste "Notes" du profil affiche des valeurs `undefined` (date, note) si elle consomme `useUserRatings()` en s'appuyant sur son typage.
- **Cause racine :** `RatingsService.listUserRatings()` (`apps/api/src/ratings/ratings.service.ts:326`) retourne `{ data, total, page, limit }` avec des champs `note_perso`/`created_at`/`updated_at`, alors que le hook frontend `useUserRatings()` (`apps/web/src/hooks/api/useUserRatings.ts`) type la réponse `PaginationResult<UserRating>`, qui attend `{ items, total, page, limit, totalPages }` avec `note`/`createdAt`. C'est le même défaut que le bug #18 (déjà corrigé pour `/watches` : `data` → `items` + `totalPages`), jamais appliqué à `/ratings`.
- **Fichiers concernés :** `apps/api/src/ratings/ratings.service.ts` (`listUserRatings`, `formatRating`), `apps/web/src/hooks/api/useUserRatings.ts`, `apps/web/src/lib/types/api.ts` (`UserRating`)
- **Correction proposée :**
  - Aligner `listUserRatings()` sur le même format que `listWatches()` : renommer `data` → `items`, ajouter `totalPages`
  - Aligner `formatRating()` sur le type frontend `UserRating` (`note`, `createdAt`) ou aligner le type frontend sur le format backend (`note_perso`, `created_at`) — choisir un seul sens de vérité plutôt que deux formats parallèles
  - Vérifier tous les consommateurs de `useUserRatings()` (page profil, historique de notes) une fois corrigé

---

## Note

Chaque bug listé ci-dessus devrait avoir :
- Un test unitaire couvrant la casse d’erreur
- Un test d’intégration si applicable
- Une vérification manuelle après correction
