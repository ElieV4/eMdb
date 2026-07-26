# Phase Frontend 2.0 — Recherche & Navigation

> **Objectif** : Implémenter la page d'accueil (dashboard), la page de recherche unifiée (films, séries, personnes), les composants de base (TitleCard, PersonCard, PersonBadge, TitleSearchBar), les hooks API (useTitles, usePeople, useSearch, useDashboard, useDebounce), et la navigation entre les pages.

**Contexte source** : `docs/emdb_roadmap_frontend.md` (Phase 2) + backend `apps/api/src/titles/` (Phase 3.3), `apps/api/src/people/` (Phase 3.4), `apps/api/src/auth/` (Phase 3.1), `apps/api/src/watches/` (Phase 4.1), `apps/api/src/follows/` (Phase 4.4).

---

## Objectifs

- [x] Implémenter la page d'accueil (dashboard) avec contenu différencié connecté/non connecté.
- [x] Implémenter la page de recherche unifiée (films, séries, personnes) avec filtres, pagination, debounce.
- [x] Créer les composants de base (TitleCard, TitlePoster, TitleSearchBar, PersonCard, PersonBadge, SimplePagination, LoadingSpinner).
- [x] Créer les hooks API (useTitles, usePeople, useSearch, useDebouncedSearch, useDashboard, useDebounce).
- [x] Gérer les états loading/error/empty dans tous les composants.
- [x] Écrire les tests unitaires (Jest + RTL) pour les composants et hooks critiques.
- [x] Écrire les scénarios Cypress e2e (non exécutés en CI).
- [x] Valider : `next build`, `next lint`, `prettier --check`, `jest`.

---

## Endpoints API consommés (vérifiés côté backend)

| Endpoint                        | Méthode | Auth | Status backend |
| ------------------------------- | ------- | ---- | -------------- |
| `/titles/search?q=&type=`       | GET     | ❌   | ✅ Existe      |
| `/titles?limit=&sortBy=&sortOrder=` | GET | ❌   | ✅ Existe      |
| `/people/search?q=`             | GET     | ❌   | ✅ Existe      |
| `/people?limit=&sortBy=&sortOrder=` | GET | ❌   | ✅ Existe      |
| `/watches?limit=&sortBy=&sortOrder=` | GET | ✅   | ✅ Existe (Phase 4.1) |
| `/follows?limit=`               | GET     | ✅   | ✅ Existe (Phase 4.4) |

> **Note** : Le paramètre de recherche est `q` côté backend (SearchTitlesDto, SearchPeopleDto), pas `query`.

---

## Pages à créer/modifier

| Page                    | Action   | Description                                                        |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `app/page.tsx`          | Créé     | Dashboard : welcome/CTA (invités), statistiques, continue watching, séries suivies, tendances, populaire |
| `app/search/page.tsx`   | Créé     | Recherche unifiée avec tabs (Tout/Films/Séries/Personnes), filtres, pagination, debounce |
| `app/titles/[id]/page.tsx` | Stub  | Stub pour Phase 3 (détail titre) — implémenté en Phase 3           |
| `app/people/[id]/page.tsx` | Stub  | Stub pour Phase 3 (détail personne) — implémenté en Phase 3        |

---

## Hooks à créer

| Hook                          | Fichier                               | Endpoint                                   |
| ----------------------------- | ------------------------------------- | ------------------------------------------ |
| `useTitles(params)`           | `hooks/api/useTitles.ts`              | `GET /titles/search?q=&type=&genre=&country=&year=&page=&limit=` |
| `useTitle(id)`                | `hooks/api/useTitles.ts`              | `GET /titles/:id` (Phase 3)                |
| `useTrendingTitles(type, limit)` | `hooks/api/useTitles.ts`           | `GET /titles?sortBy=popularity&sortOrder=desc&limit=` |
| `usePeople(params)`           | `hooks/api/usePeople.ts`              | `GET /people/search?q=&page=&limit=`       |
| `usePerson(id)`               | `hooks/api/usePeople.ts`              | `GET /people/:id` (Phase 3)                |
| `usePersonFilmography(id)`    | `hooks/api/usePeople.ts`              | `GET /people/:id/filmography` (Phase 3)    |
| `usePopularPeople(limit)`     | `hooks/api/usePeople.ts`              | `GET /people?sortBy=popularity&sortOrder=desc&limit=` |
| `useSearch(params)`           | `hooks/api/useSearch.ts`              | `GET /titles/search` + `GET /people/search` (unifié) |
| `useDebouncedSearch(params)`  | `hooks/api/useSearch.ts`              | Wrapper de useSearch avec debounce 500ms   |
| `useRecentWatches(limit)`     | `hooks/api/useDashboard.ts`           | `GET /watches?limit=&sortBy=date&sortOrder=desc` |
| `useFollowedSeries(limit)`    | `hooks/api/useDashboard.ts`           | `GET /follows?limit=`                      |
| `usePopularTitles(limit)`     | `hooks/api/useDashboard.ts`           | `GET /titles?sortBy=popularity&sortOrder=desc&limit=` |
| `useDebounce(value, delay)`   | `hooks/ui/useDebounce.ts`             | Hook utilitaire (pas d'API)                |

---

## Composants à créer

| Composant          | Fichier                              | Description                                              |
| ------------------ | ------------------------------------ | -------------------------------------------------------- |
| `TitleCard`        | `components/titles/TitleCard.tsx`    | Card titre (affiche, titre, note, année, type) + variante horizontale |
| `TitlePoster`      | `components/titles/TitlePoster.tsx`  | Affiche avec fallback placeholder, next/image, badge type |
| `TitleSearchBar`   | `components/titles/TitleSearchBar.tsx` | Barre de recherche avec autocomplete (titres + personnes), navigation clavier |
| `PersonCard`       | `components/people/PersonCard.tsx`   | Card personne (photo, nom, rôle) + variante horizontale |
| `PersonBadge`      | `components/people/PersonBadge.tsx`  | Badge compact (photo cercle + nom + rôle) + variante statique |
| `SimplePagination` | `components/common/SimplePagination.tsx` | Contrôles pagination (précédent/suivant + numéro page) |
| `LoadingSpinner`   | `components/common/LoadingSpinner.tsx` | Spinner réutilisable (Loader2)                           |

---

## Types (`lib/types/api.ts`)

- `TitleSearchResult` — Titre simplifié pour les résultats de recherche
- `PersonSearchResult` — Personne simplifiée pour les résultats de recherche
- `SearchType` — `"film" | "serie" | "personne"`
- `PaginationResult<T>` — Résultat paginé générique
- `Title`, `Person`, `User`, `UserWatch`, `UserRating`, `UserList`, `ListShare`, `Notification` — Types partagés

---

## Gestion des états (loading/error/empty)

- **Loading** : `LoadingSpinner` centré ou skeleton placeholders (`animate-pulse`) pour les grilles.
- **Error** : `notFound()` pour 404, message d'erreur affiché pour autres erreurs.
- **Empty** : Message "Aucun résultat trouvé" + illustration pour les résultats vides.

---

## Décisions prises

| Décision            | Choix                                                       | Justification                                              |
| ------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Route titre         | `app/titles/[id]/page.tsx` gère les deux types              | Un seul endpoint `GET /titles/:id` pour films et séries    |
| Route série         | Pas de route `app/series/[id]/page.tsx` — alias vers titles | Évite la duplication, endpoint identique                   |
| Recherche           | Page unifiée `/search` avec tabs + filtres                  | UX cohérente, un seul point d'entrée                       |
| Paramètre recherche | `q` (pas `query`)                                           | Aligné sur le DTO backend (`SearchTitlesDto.q`)            |
| Autocomplete        | `TitleSearchBar` avec debounce 500ms + navigation clavier   | Évite les requêtes inutiles, UX fluide                     |
| Dashboard           | Contenu différencié connecté/non connecté                   | Invités voient CTA + populaire, connectés voient activité |

---

## Points ambigus (résolus)

1. **Paramètre de recherche** : La roadmap mentionne `query` dans l'URL mais le backend utilise `q`. Décision : utiliser `q` pour correspondre au DTO backend.
2. **Page série** : La roadmap mentionne `app/series/[id]/page.tsx` comme alias. Décision : ne pas créer cette route, utiliser `app/titles/[id]/page.tsx` pour les deux types (décision validée dans Phase 3).
3. **Dashboard connecté** : Les endpoints `/watches` et `/follows` sont de la Phase 4. Décision : appeler ces endpoints depuis le dashboard, avec gestion graceful si non disponibles.

---

## Tests

### Tests unitaires (Jest + RTL)

| Fichier                                                        | Description                                      |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `__tests__/unit/components/titles/TitleCard.test.tsx`          | Rendu titre, note, année, type, fallback image   |
| `__tests__/unit/components/titles/TitlePoster.test.tsx`        | Rendu image, fallback, badge type                |
| `__tests__/unit/components/titles/TitleSearchBar.test.tsx`     | Recherche, autocomplete, navigation clavier      |
| `__tests__/unit/components/people/PersonCard.test.tsx`         | Rendu nom, photo, rôle, fallback                 |
| `__tests__/unit/components/people/PersonBadge.test.tsx`        | Rendu badge, rôle, fallback, taille            |
| `__tests__/unit/components/common/SimplePagination.test.tsx`     | Rendu, désactivation, callbacks                  |
| `__tests__/unit/components/common/LoadingSpinner.test.tsx`     | Rendu spinner                                    |
| `__tests__/unit/hooks/api/useTitles.test.ts`                   | Fetch, params `q`, loading, error, cache         |
| `__tests__/unit/hooks/api/usePeople.test.ts`                   | Fetch, params `q`, loading, error, cache         |
| `__tests__/unit/hooks/api/useSearch.test.ts`                   | Recherche unifiée titres + personnes             |
| `__tests__/unit/hooks/ui/useDebounce.test.ts`                  | Valeur débouncée, callback, annulation           |

### Scénarios Cypress (E2E) — à tester manuellement

| #   | Scénario                                                              | Priorité |
| --- | --------------------------------------------------------------------- | -------- |
| 1   | Page d'accueil charge (header, footer, CTA pour invités)              | Haute    |
| 2   | Page d'accueil connecté affiche statistiques + continue watching      | Haute    |
| 3   | Page recherche affiche tabs (Tout/Films/Séries/Personnes)             | Haute    |
| 4   | Recherche avec query affiche des résultats (titres ou personnes)     | Haute    |
| 5   | Filtres (genre, pays, année) filtrent les résultats                 | Moyenne  |
| 6   | Pagination fonctionne (page suivante/précédente)                       | Moyenne  |
| 7   | TitleCard → clic → navigation vers `/titles/:id`                      | Haute    |
| 8   | PersonCard → clic → navigation vers `/people/:id`                     | Haute    |
| 9   | TitleSearchBar autocomplete → navigation clavier (↑↓, Enter)         | Moyenne  |
| 10  | 404 personnalisé pour route inexistante                               | Moyenne  |
| 11  | Loading spinner s'affiche pendant le chargement                       | Moyenne  |
| 12  | Empty state "Aucun résultat" pour recherche sans résultats            | Moyenne  |

---

## Critères d'acceptation

- [x] `npm run build` passe.
- [x] `npm run lint` passe (0 erreur, 0 warning).
- [x] `npm run format:check` passe.
- [x] Tests unitaires Jest/RTL passent.
- [x] Page d'accueil : dashboard avec CTA (invités) + statistiques (connectés).
- [x] Page recherche : tabs, filtres, pagination, debounce.
- [x] TitleCard : affichage titre, note, année, type, fallback image.
- [x] PersonCard : affichage nom, photo, rôle, fallback.
- [x] TitleSearchBar : autocomplete, navigation clavier.
- [x] États loading/error/empty gérés dans tous les composants.
- [x] Cypress e2e scénarios documentés (non exécutés en CI).

---

## Arborescence cible Phase 2

```
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Dashboard
│   │   └── search/
│   │       └── page.tsx                    # Page recherche unifiée
│   ├── components/
│   │   ├── titles/
│   │   │   ├── TitleCard.tsx             # Card titre + variante horizontale
│   │   │   ├── TitlePoster.tsx           # Affiche avec fallback
│   │   │   ├── TitleSearchBar.tsx        # Barre de recherche autocomplete
│   │   │   └── index.ts                  # Exports
│   │   ├── people/
│   │   │   ├── PersonCard.tsx            # Card personne + variante horizontale
│   │   │   ├── PersonBadge.tsx           # Badge compact + variante statique
│   │   │   └── index.ts                  # Exports
│   │   ├── common/
│   │   │   ├── SimplePagination.tsx      # Contrôles pagination
│   │   │   └── LoadingSpinner.tsx        # Spinner réutilisable
│   │   └── layout/
│   │       ├── Header.tsx                # Header avec TitleSearchBar intégrée
│   │       └── Footer.tsx                # Footer minimal
│   ├── hooks/
│   │   ├── api/
│   │   │   ├── useTitles.ts              # Recherche + détail + trending
│   │   │   ├── usePeople.ts              # Recherche + détail + filmographie + popular
│   │   │   ├── useSearch.ts              # Recherche unifiée + debounced
│   │   │   ├── useDashboard.ts           # Recent watches, followed series, popular
│   │   │   └── index.ts                  # Exports
│   │   └── ui/
│   │       ├── useDebounce.ts            # Hook debounce + callback
│   │       └── index.ts                  # Exports
│   ├── lib/
│   │   ├── api/
│   │   │   ├── apiClient.ts              # Fetch wrapper
│   │   │   └── queryClient.ts            # Config React Query
│   │   └── types/
│   │       └── api.ts                    # Types partagés
│   └── __tests__/
│       └── unit/
│           ├── components/
│           │   ├── titles/
│           │   │   ├── TitleCard.test.tsx
│           │   │   ├── TitlePoster.test.tsx
│           │   │   └── TitleSearchBar.test.tsx
│           │   ├── people/
│           │   │   ├── PersonCard.test.tsx
│           │   │   └── PersonBadge.test.tsx
│           │   └── common/
│           │       ├── SimplePagination.test.tsx
│           │       └── LoadingSpinner.test.tsx
│           └── hooks/
│               ├── api/
│               │   ├── useTitles.test.ts
│               │   ├── usePeople.test.ts
│               │   └── useSearch.test.ts
│               └── ui/
│                   └── useDebounce.test.ts
└── cypress/
    └── e2e/
        └── phase2-search-navigation.cy.ts  # Scénarios e2e
```

---

## Plan d'implémentation

1. Créer le document de contexte (`docs/phase-frontend-2.0-search-navigation.md`).
2. Corriger le bug du paramètre de recherche (`query` → `q`) dans `useTitles.ts`, `usePeople.ts`, `useSearch.ts`.
3. Écrire les tests unitaires (Jest + RTL) pour les composants et hooks Phase 2.
4. Écrire les scénarios Cypress e2e pour Phase 2.
5. Valider : `next build`, `next lint`, `prettier --check`, `jest`.
6. Mettre à jour la documentation (roadmap, TECHNICAL_DETAILS, ARCHITECTURE_OVERVIEW).
7. Commit atomique (Conventional Commits) + sync.
