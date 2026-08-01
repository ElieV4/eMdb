# Modifications K & L — suite Historique/Calendrier + Studios

Statut : **terminé** (voir `docs/bugs.md` modifications K et L).

## Demande

- `/history` et `/calendar` : garder le format affiche (comme le module
  accueil) plutôt que le format ligne ; ajouter une période "Tout".
- Ajouter le menu "Filtres" du header sur `/history` (absent depuis la
  modif #43) ; y ajouter un dropdown "Listes" et un toggle "vu / tout /
  non vu".
- Ajouter les studios dans les infos de la page titre.
- Créer une page studio reprenant la structure de la page personne
  (filmographie + personnes connexes).

## Steps

- [x] 1. `periodGrouping.ts` : période `"tout"` (un seul groupe).
- [x] 2. `/history` et `/calendar` : `DateListItem` (ligne) → `DateCard`
      (affiche) en grille. `DateListItem.tsx` supprimé (mort). `DateCard`
      reçoit un `onRemove` optionnel (croix au survol, rendue en sibling du
      `Link` pour éviter l'imbrication `<button>`/`<a>`).
- [x] 3. `titleFilters.ts` : `listIds`/`watchedStatus` ajoutés à
      `TitleFilters` (`?listes=`, `?vu=`). `FilterableTitle` porte
      `id`/`listIds`/`watched`. Nouvel utilitaire `buildListIdsByTitle()`.
      Propagé à toutes les pages consommatrices (accueil, watchlist,
      listes, détail liste, historique).
- [x] 4. `Header.tsx` : bouton "Filtres" affiché aussi sur `/history`
      (exclusion retirée). `FilterSidebar.tsx` : toggle "Statut"
      (Tout/Vu/Non vu) + dropdown "Listes" (multi-sélection).
- [x] 5. `tsc --noEmit` + `jest` (web) : aucune erreur, baseline inchangée
      (196 passent, 10 suites en échec pré-existant sans rapport).
- [x] 6. `packages/tmdb-sync/src/index.ts` : `ensureStudioIds()` +
      insertion `title_studios`, à partir de `tmdbData.production_companies`
      (jamais consommé jusqu'ici alors que le modèle et l'affichage
      `TitleInfo.tsx` existaient déjà). Test dédié ajouté dans
      `index.spec.ts`.
      **Note technique :** `packages/tmdb-sync/src/index.js` (compilé) est
      committé et pris en priorité par Jest (`moduleFileExtensions` liste
      `js` avant `ts`) — il était déjà désynchronisé de `index.ts` avant ce
      lot. Recompilé (`npm run build` + copie `dist/tmdb-sync/src/*` →
      `src/`) pour que les tests reflètent le code réel.
- [x] 7. Backend `apps/api/src/studios/` (nouveau module, miroir de
      `people`) : `GET /studios/:id`, `/studios/:id/filmography` (groupé
      Films/Séries, même forme que `FilmographyGrouped`), `/studios/:id/people`
      ("personnes connexes" calculées localement — pas d'équivalent TMDB
      pour un studio — via les personnes les plus créditées sur ses titres).
- [x] 8. Frontend `apps/web/src/app/(frontend)/studios/[id]/page.tsx` +
      `hooks/api/useStudio.ts` + `components/studios/StudioHero.tsx` —
      réutilise directement `Filmography` et `PersonCard` (people) sans
      dupliquer de composant. `TitleInfo.tsx` : pastilles studios → liens.
- [x] 9. `tsc --noEmit` (web + api + tmdb-sync) : aucune erreur. `jest`
      (api) : 4 suites en échec, toutes pré-existantes et sans rapport
      (DB locale sans fonctions PL/pgSQL, fixtures de rôle credits) —
      confirmé par lecture du code, aucune ne touche aux fichiers modifiés.
- [x] 10. Vérifié en navigateur bout en bout : import d'un titre TMDB
       (`Dune: Part Two`, jamais en base) → `title_studios` peuplé →
       `/studios/:id` affiche hero + filmographie + personnes connexes →
       lien "Legendary Pictures" depuis la fiche titre pointe vers la page
       studio. `/history` : grille d'affiches, croix "Retirer de
       l'historique", période "Tout", filtre "Non vu" vide bien la liste.

## Reste du backlog (documenté, pas implémenté)

- Modification G : page "Découvrir" (tendances/populaires/attendus/sorties)
  — nécessite de trancher la source de données pour "Attendus" (pas
  d'équivalent direct côté TMDB).
