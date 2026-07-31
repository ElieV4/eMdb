# Bug 28 — Module filmographie : menu filtre manquant

Statut : **terminé**, redirigé en cours de route vers le header (voir `docs/bugs.md` #28).
(Le travail précédent sur le bug #27 — filmographie TMDB — reste terminé, voir `docs/bugs.md` #27.)

## Steps

- [x] 1. Backend : `getFilmography()` inclut `title_genres`/`title_countries` par titre
- [x] 2. Backend : `GET /titles/genres` et `GET /titles/countries` (listes de référence, public)
- [x] 3. Frontend : `apps/web/src/lib/titleFilters.ts` — parsing/écriture des filtres dans l'URL
      (`type`, `genres`, `pays`, `yearMin`, `yearMax`, `noteImdbMin`)
- [x] 4. Frontend : implémentation initiale dans un composant `FilmographyFilters` local au module
      — **redirigé sur demande utilisateur** vers le header (étapes 5-7)
- [x] 5. Frontend : `Header.tsx` — onglets Tout/Film/Série écrivent dans l'URL ; premier jet du
      menu "Filtres" en dropdown — **redirigé sur demande utilisateur** vers une sidebar (étape 5bis)
- [x] 5bis. Frontend : `FilterSidebar.tsx` (nouveau) — sidebar droite déployée par le bouton
      "Filtres" du header ; genre et pays en dropdowns multi-sélection dédiés (au lieu de listes à
      cocher toujours dépliées) ; année et note IMDB en sliders **double sens** (min ET max, pas
      juste un minimum)
- [x] 6. Frontend : `Filmography.tsx` lit les filtres via `useSearchParams()`, plus de UI de
      filtre locale au module
- [x] 7. Fix : `<Header />` encapsulé dans `<Suspense>` dans `(frontend)/layout.tsx`
      (`useSearchParams()` casse le rendu statique des pages non-dynamiques sans ça)
- [x] 8. Fix : `startTransition()` autour de `router.push()` dans `Header.tsx` — sans ça,
      "Cannot update a component while rendering a different component" empêchait les
      cases à cocher genre/pays de fonctionner (conflit avec le rendu interne du menu Base UI)
- [x] 9. Build & test
  - Build backend ✅ (`nest build`)
  - Build frontend production ✅ (`next build`, y compris prerendering statique)
  - Testé manuellement en navigateur (Christopher Nolan : filtre Films, genre Drame,
    plage d'années, reset — chaque filtre réduit correctement la liste)

## Abandonné / reporté

- Filtre "ma note" (note personnelle) : abandonné, `GET /ratings` a un défaut de format
  qui empêche de s'appuyer dessus proprement — voir `docs/bugs.md` #39 (nouveau bug documenté).

## Suivi

- Bug #33 (filtres header sur page recherche) : partiellement résolu — le mécanisme URL est
  générique et disponible, mais `search/page.tsx` ne le consomme pas encore.
- Bug #34 (menu filtre à refondre) : partiellement résolu — genre/pays/année/note IMDB faits ;
  statut, durée, toggles vu/watchlist, et le scoping par page restent à faire.
- Bug #39 (nouveau) : `GET /ratings` renvoie `{ data, note_perso, ... }` au lieu de
  `{ items, note, ... }` attendu par le type frontend — même défaut que le bug #18, jamais
  corrigé pour `/ratings`.
- Bruit console (non documenté comme bug à part) : ouvrir le menu "Filtres" du header déclenche
  une erreur React récupérable (`Base UI: MenuGroupContext is missing`) sans impact fonctionnel
  constaté. Cause exacte non identifiée.
