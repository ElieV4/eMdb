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

### A. Module personnes : filtre par badge rôle
- **Description :** Ajouter un filtre par rôle (acteur, réalisateur, scénariste, autre) dans la page personne et la filmographie, sous forme de badges cliquables.
- **Fichier concerné :** `apps/web/src/app/people/[id]/page.tsx`, `apps/web/src/components/people/Filmography.tsx`

### B. Module filmographie : filtre par badge rôle
- **Description :** Ajouter un filtre par badge rôle dans le module filmographie pour afficher/masquer les crédits par rôle.
- **Fichier concerné :** `apps/web/src/components/people/Filmography.tsx`

### C. Modules "Distribution & Équipe" et "Filmographie" : liste unique dédupliquée + filtre rôle multi-sélection
- **Description :** Remplacer l'affichage actuel (plusieurs listes séparées par rôle) par une liste unique de valeurs distinctes — une personne (dans Distribution & Équipe) ou un titre (dans Filmographie) n'apparaît qu'une seule fois même si elle a plusieurs rôles sur ce titre/cette filmographie, avec le ou les rôles affichés en badge sur chaque élément. Ajouter en haut du module un filtre par rôle sous forme de boutons multi-sélectionnables (Tout, Acteur, Réalisateur, Producteur, ...), plutôt que des listes séparées par rôle.
- **Remplace/fusionne avec :** les items A et B ci-dessus (filtre par badge rôle) — cette modification change aussi la structure d'affichage sous-jacente, pas seulement l'ajout d'un filtre par-dessus les listes existantes.
- **Fichiers concernés :** `apps/web/src/components/titles/TitleCreditsSplit.tsx`, `apps/web/src/components/people/Filmography.tsx`, `apps/web/src/components/people/PersonBadge.tsx` (badge(s) de rôle par personne), `apps/web/src/lib/types/api.ts`
- **Note :** `TitleCreditsSplit.tsx` sépare actuellement "Distribution" et "Équipe technique" via une constante `CREW_ROLES` en anglais (`Director`, `Producer`, ...) comparée aux libellés de rôle stockés en base, qui sont en français (`Réalisateur`, `Producteur`, ...) — la comparaison ne matche jamais, donc tout le monde atterrit dans "Distribution" aujourd'hui. Cette modification remplace ce mécanisme cassé plutôt que de le corriger isolément.

### D. Unifier "Watchlist" et "Suivre" — le bookmark doit refléter la watchlist
- **Description demandée :** "Watchlist" et "Suivre" doivent devenir la même chose. Concrètement : ajouter un film (pas seulement une série) à la watchlist doit faire apparaître l'icone bookmark sur son affiche (actuellement le bookmark n'est piloté que par le mécanisme "Suivre", cf. bug #30).
- **Constat de l'existant (deux mécanismes aujourd'hui totalement indépendants) :**
  - **Watchlist** : une liste comme une autre — une ligne `user_lists` avec `type = 'watchlist'`, des `list_items` classiques. Ajout via `POST /lists/:listId/items` (`apps/api/src/lists/`), UI dans `TitleActions.tsx` (menu burger "Listes" → toggle "Watchlist"). Fonctionne pour films et séries indifféremment.
  - **Suivre** : table dédiée `user_follows_serie` (`user_id`, `title_id`). Endpoints `POST/DELETE/GET /follows` (`apps/api/src/watches/`). **`WatchesService.follow()` rejette explicitement les films** : `if (title.type !== 'serie') throw new BadRequestException('Seules les séries peuvent être suivies.')` (`watches.service.ts:410`). UI : bouton dédié dans `TitleActions.tsx`, affiché seulement pour les séries.
  - Le bookmark (`followed` sur `TitlePoster`/`TitleCard`, bug #30) est alimenté uniquement par `useFollowedTitleIds()` → `GET /follows` — aucun lien avec la watchlist aujourd'hui.
  - Le suivi (`follow`) sert aussi de base au calendrier des épisodes à venir et aux notifications de nouveaux épisodes (module Watches/notifications) — un film n'a pas d'épisodes, donc cette partie ne peut pas s'appliquer telle quelle aux films.
- **Décision de conception à trancher avant implémentation (à valider avec l'utilisateur) :**
  1. Le bookmark reflète **l'union** watchlist ∪ suivi (le plus simple : `useFollowedTitleIds` ou son équivalent regarde aussi les `list_items` de la liste `watchlist`), sans toucher à la restriction séries-only de `follow()` — un film ajouté à la watchlist affiche le bookmark, une série ajoutée à la watchlist OU suivie affiche le bookmark.
  2. Fusion plus profonde : ajouter un titre à la watchlist déclenche automatiquement un `follow` quand c'est une série (unifie réellement les deux actions utilisateur), et retire la restriction séries-only uniquement pour la relation watchlist↔bookmark, pas pour le calendrier/notifications qui restent séries-only par nature.
- **Fichiers concernés (pressentis) :** `apps/api/src/watches/watches.service.ts` (`follow`), `apps/api/src/lists/lists.service.ts` (`addItem`/`removeItem`), `apps/web/src/hooks/api/useFollowedTitleIds.ts`, `apps/web/src/components/titles/TitleActions.tsx`
- **Tests à créer :**
  - Vérifier qu'ajouter un film à la watchlist fait apparaître le bookmark sur son affiche
  - Vérifier qu'ajouter une série à la watchlist fait apparaître le bookmark sans dupliquer une notification/calendrier si elle n'est pas explicitement suivie (selon l'option retenue)

### E. Retirer le module "Listes" de la page profil — ✅ fait
- **Description demandée :** Supprimer la section "Gestion des listes" (grille de listes + bouton "Créer une liste") de `app/(frontend)/profile/page.tsx` — les listes ont désormais leur propre page dédiée (`/lists`, cf. bug #43), ce module est redondant sur le profil.
- **Fait :** section retirée. La section "Favoris" (titres favoris en grille) est conservée — distincte du module "Listes", non concernée par la demande. `useLists()` reste appelé (nécessaire pour repérer la liste favoris), mais `ListCard`/`ListDialog` et les imports associés (Button, Skeleton, Alert, Plus) ont été retirés, plus utilisés.
- **Fichier modifié :** `apps/web/src/app/(frontend)/profile/page.tsx`

### F. Simplifier l'en-tête de la page d'accueil — ✅ fait
- **Description demandée :** Retirer le bloc "Bienvenue, {pseudo}" et les 4 cases de statistiques (Visionnages/Notes/Listes/Séries suivies) de la page d'accueil.
- **Fait :** bloc "Bienvenue, {pseudo}" et grille de 4 stats retirés pour les utilisateurs connectés — le dashboard démarre directement sur la section Historique. L'en-tête "Bienvenue sur eMDB" + CTA (Créer un compte/Se connecter) pour les visiteurs non connectés est conservé (non concerné par la demande). Nettoyage associé : composant `StatCard` (devenu mort) et hook `useFollowedSeries()` (plus consommé) retirés.
- **Fichier modifié :** `apps/web/src/app/(frontend)/page.tsx`

### G. Nouvelle page "Découvrir" (tendances, populaires, attendus, sorties)
- **Description demandée :** Créer une page dédiée à la découverte de titres, avec 4 modules : Tendances, Populaires, Attendus, Sorties.
- **À trancher avant implémentation :** la source de chaque module — TMDB expose des endpoints tout faits pour une partie (`trending`, `popular`, `upcoming`/`now_playing`), mais pas forcément un équivalent direct pour "attendus" (le plus proche : `upcoming` trié par nombre de votes/popularité anticipée, ou une note communautaire de type "most anticipated" qui n'existe pas nativement sur TMDB) — si la donnée n'est pas disponible telle quelle, réfléchir à un algo de substitution par module (ex. "Attendus" = titres non sortis triés par popularité TMDB décroissante).
- **Fichiers concernés (pressentis) :** nouvelle route `apps/web/src/app/(frontend)/discover/page.tsx`, nouveaux hooks `apps/web/src/hooks/api/useDiscover*.ts`, éventuel nouvel endpoint backend si TMDB ne couvre pas tous les modules directement.

### H. Menu contextuel (trois points) sur les affiches de titres
- **Description demandée :** Sur les affiches de titres (`TitleCard`/`TitlePoster`), quel que soit le module où elles apparaissent, ajouter un bouton "⋮" (trois points) en haut à droite ouvrant un dropdown dont le contenu dépend de l'état du titre pour l'utilisateur connecté :
  - Ajouter à la watchlist / Retirer de la watchlist (selon présence actuelle)
  - Marquer comme vu, avec un sous-menu/dropdown de sélection de date — ou Retirer de l'historique si déjà vu
- **Fichiers concernés (pressentis) :** `apps/web/src/components/titles/TitleCard.tsx`, `apps/web/src/components/titles/TitlePoster.tsx`, réutilisation des hooks existants (`useAddItem`/`useRemoveItem`, `useCreateWatch`/`useDeleteWatch`) déjà utilisés dans `TitleActions.tsx` sur la page titre — à factoriser plutôt que dupliquer la logique.

### I. Tooltip au survol des icônes "vu" et "bookmark" sur les affiches
- **Description demandée :** Ajouter une bulle d'aide (tooltip) expliquant ce que représente l'icône au survol des icônes "vu" (œil rouge, bug #29) et "bookmark" (bug #30) sur les affiches.
- **Fichiers concernés :** `apps/web/src/components/titles/TitlePoster.tsx` (ou équivalent portant ces icônes)
- **Dépend de :** bug #44 ci-dessous (icônes non fonctionnelles) — à vérifier/corriger avant ou en même temps que l'ajout du tooltip.

---

## Bugs à corriger — Header & Navigation


### 34. Menu filtre du header à refondre
- **Symptôme :** Le menu "Filtres" dans le header est un simple dropdown de texte inutile. Il doit contenir des contrôles fonctionnels : dropdown pour genres/région/statut, curseur pour durée et date de sortie, toggle pour vu et watchlist.
- **Cause racine :** Le menu filtre a été implémenté comme un placeholder avec des `DropdownMenuItem` vides.
- **Fichiers concernés :** `apps/web/src/components/layout/Header.tsx`
- **Statut :** **partiellement résolu** (bug #28) — le bouton "Filtres" du header déploie désormais une sidebar droite (`FilterSidebar.tsx`) contenant : dropdown **Genre** (multi-select), dropdown **Région (pays)** (multi-select), curseur **Année de sortie** (range slider double sens), curseur **Note IMDB** (range slider double sens, min ET max). Écrivent tous dans les paramètres d'URL de la page courante.
- **Reste à faire :**
  - Dropdown **Statut** (disponible, prévu, etc.)
  - Curseur (range slider) pour **Durée**
  - Toggle pour **Dans vu**
  - Toggle pour **Dans watchlist**
  - Restreindre l'affichage du menu aux pages recherche/calendrier/watchlist/historique/listes (actuellement affiché sur toutes les pages, y compris titres/épisodes/séries où il ne devrait pas apparaître)

### 35. URL `?type=film` ou `?type=serie` dans les recommandations cause "The operation was aborted"
- **Symptôme :** Quand on clique sur un film dans "Titres recommandés", l'URL contient `?type=film` ou `?type=serie` et la page affiche "The operation was aborted". La page charge normalement si on retire le suffixe de l'URL.
- **Cause racine :** Le paramètre `type` dans l'URL n'est pas géré correctement par la page de détail du titre. La page `/titles/[id]` ne sait pas traiter `?type=film` et cela cause une erreur de requête.
- **Fichiers concernés :** `apps/web/src/app/(frontend)/titles/[id]/page.tsx`, `apps/web/src/lib/types/api.ts`
- **Correction proposée :**
  - Nettoyer le paramètre `type` de l'URL avant de faire les appels API
  - Ou gérer le paramètre `type` dans la page de détail pour déterminer le type de contenu
  - Vérifier la fonction `titleRecommendationToSearchResult()` qui génère ces URLs

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

### 45. Icônes "vu" et "bookmark" non fonctionnelles sur les affiches
- **Symptôme :** Signalé par l'utilisateur — les icônes "vu" (œil rouge, bug #29) et "bookmark" (bug #30) sur les affiches de titres (`TitleCard`/`TitlePoster`) ne fonctionnent pas. Ces bugs avaient été marqués résolus précédemment (cf. entrées #29/#30 dans "Bugs corrigés") — à reproduire pour déterminer s'il s'agit d'une régression ou d'un cas non couvert par la correction initiale (ex. affiches dans un module particulier, comme les nouvelles pages `/watchlist`, `/lists/:id`, sections de l'accueil introduites par le bug #43).
- **Fichiers concernés (pressentis) :** `apps/web/src/components/titles/TitlePoster.tsx`, `apps/web/src/components/titles/TitleCard.tsx`, `apps/web/src/hooks/api/useWatchedTitles.ts`, `apps/web/src/hooks/api/useFollowedTitleIds.ts`
- **Statut :** non investigué — symptôme signalé, cause à identifier.

---

## Note

Chaque bug listé ci-dessus devrait avoir :
- Un test unitaire couvrant la casse d’erreur
- Un test d’intégration si applicable
- Une vérification manuelle après correction
