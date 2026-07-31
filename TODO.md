# Bug 27 — Filmographie : pas de mise à jour TMDB au chargement de la page

Statut : **terminé** (voir `docs/bugs.md` #27 pour le détail complet, y compris la suite dans la même session).

## Steps

- [x] 1. Backend: Add `refreshFilmography()` method in `people.service.ts`
  - Get person + check tmdb_id
  - Call `getPersonCombinedCredits(tmdb_id)` from `@emdb/tmdb-client`
  - Import allégé (`withCredits: false`) des titres manquants + création directe du
    credit de la personne via `ensureCreditRecord()`, à partir des données déjà
    connues dans `getPersonCombinedCredits` (pas besoin de réimporter tout le
    casting des autres titres)
  - Return updated filmography via existing `getFilmography()`
  - Import parallélisé (`Promise.all`) pour éviter que la requête dure trop longtemps

- [x] 2. Backend: Add `POST /people/:id/filmography/refresh` endpoint in `people.controller.ts`
  - Protected by `JwtAuthGuard`
  - Calls `peopleService.refreshFilmography(id)`

- [x] 3. Frontend: Add `useRefreshFilmography()` mutation hook
  - Uses `useMutation` with `POST /people/:id/filmography/refresh`
  - Invalidates `["people", "filmography", id]` on success
  - `timeoutMs: 120_000` (le timeout par défaut de 10s de `apiFetch` coupait la requête avant la fin de l'import)

- [x] 4. Frontend: Trigger refresh on mount in `people/[id]/page.tsx`
  - Import `useRefreshFilmography`
  - `useEffect` + `useRef` au montage pour déclencher le refresh une seule fois (fire-and-forget)
  - **Était marqué fait mais ne l'était pas réellement — c'est la cause du chargement aléatoire.**

- [x] 5. Frontend: Filmography.tsx affiche 10 titres max par rôle + bouton « Voir plus »
  - Même pattern que `TitleCreditsSplit` (state d'expansion par groupe)

- [x] 6. Frontend: Filmography.tsx — filtre "Tout / Films / Séries"

- [x] 7. Backend: rôles spécifiques au lieu de tout regrouper sous "Autre"
  - `resolveCrewRole()` dans `packages/tmdb-mapper` (Producteur, Producteur exécutif,
    Directeur de la photographie, Compositeur, Monteur, Casting)
  - Ne s'applique qu'aux nouveaux credits créés, pas de backfill des anciens

- [x] 8. Fix : `packages/tmdb-sync` et `packages/tmdb-mapper` sans `declaration: true`
  dans leur tsconfig — un `npm run build` normal ne régénérait jamais leurs `.d.ts`

- [x] 9. Fix (trouvé en marge) : lien "Personne connexe" utilisait `TitleCard`
  (→ `/titles/...`) au lieu de `PersonCard` (→ `/people/...`)

- [x] 10. Build & test
  - Build backend to verify compilation ✅ (`nest build`)
  - Frontend type-check ✅ (`tsc --noEmit`, aucune nouvelle erreur)
  - Testé manuellement en navigateur (Tom Holland, Robert Pattinson, Christopher Nolan)

## Suivi

Bugs/modifications découverts pendant ce travail et documentés dans `docs/bugs.md`
pour correction ultérieure : #36, #37, #38, modification C.
