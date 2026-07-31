# Bug 43 — Filtres header sur accueil/watchlist/listes/historique + données de listes cassées

Statut : **terminé** (voir `docs/bugs.md` #43).
(Le travail précédent sur les bugs #27-#32, #40, #41, #42, #33 reste terminé, voir `docs/bugs.md`.)

## Demande initiale

L'utilisateur voulait que les filtres du header (type + genre/pays/année/note)
s'appliquent sur accueil / watchlist / listes / historique.

## Cause racine découverte en creusant

Avant même de parler de filtres, ces pages n'affichaient jamais leurs titres
correctement :
- `GET /lists` ne renvoyait jamais les items d'une liste (seulement `_count`)
  → watchlist de l'accueil, page `/watchlist`, favoris du profil toujours vides.
- `ListCard.tsx` affichait `list.items?.length` (toujours 0) au lieu de
  `_count.list_items` → "0 titres" partout sur `/lists`.
- La page `/lists/:id` n'existait pas du tout.
- Le typage frontend `ListDetail.items` ne correspondait pas à la réponse
  réelle du backend.

## Steps

- [x] 1. Confirmé avec l'utilisateur (question posée) : scope élargi accepté
      pour corriger la fondation de données avant de brancher les filtres.
- [x] 2. Backend : `getUserLists()` inclut un tableau `items` allégé par liste
      (type/année/note/genreIds/countryIds) pour le filtrage sans N+1.
- [x] 3. Backend : `getListDetail()` renvoie les items au format frontend
      `Title` (camelCase, avec genres/pays/note/date de sortie).
- [x] 4. Nouvelle page `/lists/[id]` (détail liste, avec filtres).
- [x] 5. `ListCard.tsx` : compteur `_count.list_items`, carte cliquable vers
      `/lists/:id`.
- [x] 6. `/watchlist`, accueil (section Watchlist), profil (section Favoris) :
      basculés sur `useList(listId)` (détail réel) au lieu de `useLists()`.
- [x] 7. `lib/titleFilters.ts` : ajout de `titleMatchesFilters`/
      `toFilterableTitle`/`FilterableTitle`.
- [x] 8. Filtres branchés : accueil (Watchlist + Historique), `/watchlist`,
      `/lists` (n'affiche que les listes avec un titre correspondant),
      `/lists/:id`, `/history` (filtre type uniquement, transmis au backend).
- [x] 9. `Header.tsx` : menu de filtres restreint aux pages où il a un effet
      (`/`, `/search`, `/calendar`, `/watchlist`, `/lists`, `/history`) ;
      bouton "Filtres" (genre/pays/année/note) masqué sur `/history` (données
      non disponibles sur les visionnages).
- [x] 10. `lists.service.spec.ts` mis à jour pour la nouvelle forme de
       réponse — 36 tests, tous verts.
- [x] 11. `npx tsc --noEmit` (frontend) : aucune erreur. Backend : compile
       proprement (`Nest application successfully started`).
- [x] 12. Vérifié dans le navigateur (compte de test, 1 film + 1 série en
       watchlist) : `/watchlist`, `/lists` (compteur correct), `/lists/:id`,
       accueil affichent les vrais titres ; filtre "Film" fonctionne ; les
       filtres sont bien masqués sur `/titles/:id`.

## Backlog ajouté (documenté dans docs/bugs.md, pas implémenté)

Sur demande de l'utilisateur, ajouté dans `docs/bugs.md` :
- Bug #44 : filtre "Série" sur `/history` ne renvoie rien (cause identifiée :
  les watches d'épisodes ont `title_id = null`, non couverts par le filtre).
- Bug #45 : icônes vu/bookmark non fonctionnelles sur les affiches (à
  reproduire — possible régression des bugs #29/#30).
- Modification E : retirer le module Listes de la page profil.
- Modification F : simplifier l'en-tête de l'accueil (retirer bienvenue + stats).
- Modification G : nouvelle page "Découvrir" (tendances/populaires/attendus/sorties).
- Modification H : menu contextuel "⋮" sur les affiches (watchlist/vu avec date).
- Modification I : tooltip au survol des icônes vu/bookmark.
