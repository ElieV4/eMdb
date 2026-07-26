# Phase Frontend 3.0 — Pages de détail (titres, personnes, saisons, épisodes)

> **Objectif** : Implémenter les pages de détail complètes pour les titres (films/séries), personnes, saisons et épisodes, avec leurs composants associés et les hooks API.

**Contexte source** : `docs/emdb_roadmap_frontend.md` (Phase 3) + `docs/phase-frontend-2.0-search.md` (Phase 2) + backend `apps/api/src/titles/`, `people/`, `seasons-episodes/`, `credits/` + contextes backend `phase-3.5-seasons-episodes-context.md`, `phase-3.6-credits-context.md`.

---

## Objectifs

- [x] Implémenter la page détail titre (film et série) avec hero, métadonnées, distribution, saisons, recommendations.
- [x] Implémenter la page détail personne avec hero, bio, filmographie groupée par rôle, recommendations.
- [x] Implémenter la page saison avec liste des épisodes.
- [x] Implémenter la page épisode avec synopsis, crédits, navigation voisinage.
- [x] Créer les hooks API pour les nouveaux endpoints.
- [x] Créer les composants dédiés (TitleHero, TitleInfo, TitleCredits, TitleRecommendations, SeasonCard, EpisodeRow, EpisodeCard, PersonHero, Filmography).
- [x] Gérer les états loading/error/empty dans tous les composants.
- [x] Écrire les tests unitaires (Jest + RTL) pour les composants et hooks critiques.
- [x] Écrire les scénarios Cypress e2e (non exécutés en CI).
- [x] Valider : `next build`, `next lint`, `prettier --check`, `jest`.

---

## Endpoints API consommés (vérifiés côté backend)

| Endpoint                                     | Méthode | Auth | Status backend |
| -------------------------------------------- | ------- | ---- | -------------- |
| `/titles/:id`                                | GET     | ❌   | ✅ Existe      |
| `/titles/:id/recommendations`                | GET     | ❌   | ✅ Existe      |
| `/titles/:titleId/credits`                   | GET     | ❌   | ✅ Existe      |
| `/titles/:titleId/seasons`                   | GET     | ❌   | ✅ Existe      |
| `/titles/:titleId/seasons/:numero`           | GET     | ❌   | ✅ Existe      |
| `/episodes/:id`                              | GET     | ❌   | ✅ Existe      |
| `/episodes/:id/credits`                      | GET     | ❌   | ✅ Existe      |
| `/people/:id`                                | GET     | ❌   | ✅ Existe      |
| `/people/:id/filmography`                    | GET     | ❌   | ✅ Existe      |
| `/people/:id/recommendations`                | GET     | ❌   | ✅ Existe      |

---

## Pages à créer/modifier

| Page                                          | Action   | Description                                                                 |
| --------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `app/titles/[id]/page.tsx`                    | Modifier | Page détail titre (film ou série) — hero, métadonnées, distribution, saisons, recos |
| `app/people/[id]/page.tsx`                    | Modifier | Page détail personne — hero, bio, filmographie, recos                       |
| `app/episodes/[id]/page.tsx`                  | Créer    | Page détail épisode — synopsis, crédits, navigation voisinage               |
| `app/series/[id]/seasons/[numero]/page.tsx`   | Créer    | Page saison — header + liste des épisodes                                   |

---

## Hooks à créer

| Hook                          | Fichier                               | Endpoint                                   |
| ----------------------------- | ------------------------------------- | ------------------------------------------ |
| `useTitleCredits(titleId)`    | `hooks/api/useTitleCredits.ts`        | `GET /titles/:titleId/credits`             |
| `useTitleRecommendations(id)` | `hooks/api/useTitleRecommendations.ts`| `GET /titles/:id/recommendations`          |
| `useSeasons(titleId)`         | `hooks/api/useSeasons.ts`             | `GET /titles/:titleId/seasons`             |
| `useSeason(titleId, numero)`  | `hooks/api/useSeason.ts`              | `GET /titles/:titleId/seasons/:numero`     |
| `useEpisode(id)`              | `hooks/api/useEpisode.ts`             | `GET /episodes/:id`                        |
| `useEpisodeCredits(id)`       | `hooks/api/useEpisodeCredits.ts`      | `GET /episodes/:id/credits`                |
| `usePersonRecommendations(id)` | `hooks/api/usePersonRecommendations.ts` | `GET /people/:id/recommendations`       |

> `usePersonFilmography(id)` existe déjà dans `usePeople.ts`.

---

## Composants à créer

| Composant                    | Fichier                                  | Description                                              |
| ---------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `TitleHero`                  | `components/titles/TitleHero.tsx`        | Hero banner (backdrop + poster + titre + note)           |
| `TitleInfo`                  | `components/titles/TitleInfo.tsx`        | Métadonnées (genres, pays, dates, durée, statut)         |
| `TitleCredits`               | `components/titles/TitleCredits.tsx`     | Distribution groupée par rôle (cast/crew)                |
| `TitleRecommendations`       | `components/titles/TitleRecommendations.tsx` | Carrousel de titres recommandés                     |
| `SeasonCard`                 | `components/seasons/SeasonCard.tsx`      | Card saison (numéro, titre, nb épisodes, poster)         |
| `EpisodeRow`                 | `components/seasons/EpisodeRow.tsx`      | Ligne d'épisode (tableau) avec statut vu, boutons        |
| `EpisodeCard`                | `components/seasons/EpisodeCard.tsx`     | Card épisode (mobile)                                     |
| `PersonHero`                 | `components/people/PersonHero.tsx`       | Hero personne (photo + nom + bio + pays)                 |
| `Filmography`                | `components/people/Filmography.tsx`      | Filmographie groupée par rôle                            |

---

## Types à ajouter (`lib/types/api.ts`)

- `TitleDetail` — Title étendu avec genres, pays, studios, saisons
- `SeasonWithEpisodes` — Saison avec épisodes
- `EpisodeDetail` — Épisode avec saison parente
- `CreditGrouped` — Record<string, CreditItem[]>
- `CreditItem` — Élément de crédit (personnage, ordre, personne)
- `PersonRecommendation` — Personne recommandée
- `TitleRecommendation` — Titre recommandé

---

## Gestion des états (loading/error/empty)

- **Loading** : `LoadingSpinner` centré ou skeleton placeholders pour les grilles.
- **Error** : `notFound()` pour 404, message d'erreur affiché pour autres erreurs.
- **Empty** : Message "Aucune donnée" + illustration pour les sections vides (ex: pas de saisons, pas de crédits, pas de recommendations).

---

## Décisions prises

| Décision            | Choix                                                       | Justification                                              |
| ------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Route série         | `app/titles/[id]/page.tsx` gère les deux types              | Un seul endpoint `GET /titles/:id` pour films et séries    |
| Route saison        | `app/series/[id]/seasons/[numero]/page.tsx`                 | Hiérarchie claire, navigation depuis la page série         |
| Route épisode       | `app/episodes/[id]/page.tsx`                                | UUID direct, plus simple pour le frontend                  |
| Credits             | Groupés par rôle (Record<string, CreditItem[]>)             | Aligné sur la réponse backend                              |
| Filmographie        | Groupée par rôle (Record<string, FilmographyItem[]>)        | Aligné sur `GET /people/:id/filmography`                 |
| Recommendations     | Carousel horizontal avec TitleCard/PersonCard               | Réutilise les composants existants                         |
| Images              | `next/image` + `TitlePoster` existant                       | Optimisation + placeholder                                 |

---

## Points ambigus (résolus)

1. **Page série vs page titre** : La roadmap mentionne `app/series/[id]/page.tsx` comme alias. Décision : utiliser `app/titles/[id]/page.tsx` pour les deux types (film/serie), car l'endpoint backend est le même. La page détecte le type et affiche les sections appropriées (saisons pour les séries, pas de saisons pour les films).
2. **Route saison** : La roadmap mentionne `app/series/[id]/seasons/[numero]/page.tsx`. Décision : créer cette route. La page récupère la saison via `GET /titles/:titleId/seasons/:numero` et affiche les épisodes.
3. **Épisode page** : La roadmap mentionne `app/episodes/[id]/page.tsx`. Décision : créer cette route avec `GET /episodes/:id` et `GET /episodes/:id/credits`.

---

## Tests

### Tests unitaires (Jest + RTL)

| Fichier                                                        | Description                                      |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `__tests__/unit/components/titles/TitleHero.test.tsx`          | Rendu titre, note, type, image fallback          |
| `__tests__/unit/components/titles/TitleInfo.test.tsx`          | Rendu genres, pays, dates, durée                 |
| `__tests__/unit/components/titles/TitleCredits.test.tsx`       | Rendu groupé par rôle, personnes                 |
| `__tests__/unit/components/titles/TitleRecommendations.test.tsx` | Rendu carousel, navigation, empty state        |
| `__tests__/unit/components/seasons/SeasonCard.test.tsx`        | Rendu numéro, titre, nb épisodes                 |
| `__tests__/unit/components/seasons/EpisodeRow.test.tsx`        | Rendu numéro, titre, date, statut                |
| `__tests__/unit/components/seasons/EpisodeCard.test.tsx`       | Rendu card mobile, image, titre                  |
| `__tests__/unit/components/people/PersonHero.test.tsx`         | Rendu nom, photo, bio, pays                      |
| `__tests__/unit/components/people/Filmography.test.tsx`        | Rendu groupé par rôle, titres cliquables         |
| `__tests__/unit/hooks/api/useTitleCredits.test.ts`             | Fetch, loading, error, cache                     |
| `__tests__/unit/hooks/api/useTitleRecommendations.test.ts`     | Fetch, loading, error                            |
| `__tests__/unit/hooks/api/useSeasons.test.ts`                  | Fetch, loading, error                            |
| `__tests__/unit/hooks/api/useSeason.test.ts`                   | Fetch, loading, error                            |
| `__tests__/unit/hooks/api/useEpisode.test.ts`                  | Fetch, loading, error                            |
| `__tests__/unit/hooks/api/useEpisodeCredits.test.ts`           | Fetch, loading, error                            |
| `__tests__/unit/hooks/api/usePersonRecommendations.test.ts`    | Fetch, loading, error                            |

### Scénarios Cypress (E2E) — à tester manuellement

| #   | Scénario                                                              | Priorité |
| --- | --------------------------------------------------------------------- | -------- |
| 1   | Page titre affiche le hero, les métadonnées, la distribution          | Haute    |
| 2   | Page série affiche les saisons avec le nombre d'épisodes              | Haute    |
| 3   | Page saison liste les épisodes avec titre, date, durée                | Haute    |
| 4   | Page épisode affiche le synopsis, les crédits, le lien vers la saison | Haute    |
| 5   | Page personne affiche la bio, la filmographie groupée par rôle        | Haute    |
| 6   | Recommendations affichent des titres/personnes cliquables             | Moyenne  |
| 7   | 404 s'affiche pour un titre/personne/épisode inexistant              | Moyenne  |
| 8   | Loading spinner s'affiche pendant le chargement des données           | Moyenne  |

---

## Critères d'acceptation

- [x] `npm run build` passe.
- [x] `npm run lint` passe (0 erreur, 0 warning).
- [x] `npm run format:check` passe.
- [x] Tests unitaires Jest/RTL passent.
- [x] Page titre : hero, métadonnées, distribution, saisons (si série), recommendations.
- [x] Page personne : hero, bio, filmographie groupée, recommendations.
- [x] Page saison : header + liste des épisodes.
- [x] Page épisode : synopsis, crédits, navigation.
- [x] États loading/error/empty gérés dans tous les composants.
- [x] Cypress e2e scénarios documentés (non exécutés en CI).

---

## Arborescence cible Phase 3

```
apps/web/
├── src/
│   ├── app/
│   │   ├── titles/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # MODIFIÉ : page détail titre complète
│   │   ├── people/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # MODIFIÉ : page détail personne complète
│   │   ├── episodes/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # CRÉÉ : page détail épisode
│   │   └── series/
│   │       └── [id]/
│   │           └── seasons/
│   │               └── [numero]/
│   │                   └── page.tsx  # CRÉÉ : page saison
│   ├── components/
│   │   ├── titles/
│   │   │   ├── TitleHero.tsx                 # CRÉÉ
│   │   │   ├── TitleInfo.tsx                 # CRÉÉ
│   │   │   ├── TitleCredits.tsx              # CRÉÉ
│   │   │   ├── TitleRecommendations.tsx      # CRÉÉ
│   │   │   └── index.ts                      # MODIFIÉ : exports
│   │   ├── seasons/
│   │   │   ├── SeasonCard.tsx                # CRÉÉ
│   │   │   ├── EpisodeRow.tsx                # CRÉÉ
│   │   │   ├── EpisodeCard.tsx               # CRÉÉ
│   │   │   └── index.ts                      # CRÉÉ
│   │   └── people/
│   │       ├── PersonHero.tsx                # CRÉÉ
│   │       ├── Filmography.tsx               # CRÉÉ
│   │       └── index.ts                      # MODIFIÉ : exports
│   ├── hooks/
│   │   └── api/
│   │       ├── useTitleCredits.ts            # CRÉÉ
│   │       ├── useTitleRecommendations.ts    # CRÉÉ
│   │       ├── useSeasons.ts                 # CRÉÉ
│   │       ├── useSeason.ts                  # CRÉÉ
│   │       ├── useEpisode.ts                 # CRÉÉ
│   │       ├── useEpisodeCredits.ts          # CRÉÉ
│   │       ├── usePersonRecommendations.ts   # CRÉÉ
│   │       └── index.ts                      # MODIFIÉ : exports
│   └── lib/
│       └── types/
│           └── api.ts                        # MODIFIÉ : nouveaux types
├── __tests__/
│   └── unit/
│       ├── components/
│       │   ├── titles/
│       │   │   ├── TitleHero.test.tsx        # CRÉÉ
│       │   │   ├── TitleInfo.test.tsx        # CRÉÉ
│       │   │   ├── TitleCredits.test.tsx     # CRÉÉ
│       │   │   └── TitleRecommendations.test.tsx # CRÉÉ
│       │   ├── seasons/
│       │   │   ├── SeasonCard.test.tsx       # CRÉÉ
│       │   │   ├── EpisodeRow.test.tsx       # CRÉÉ
│       │   │   └── EpisodeCard.test.tsx      # CRÉÉ
│       │   └── people/
│       │       ├── PersonHero.test.tsx       # CRÉÉ
│       │       └── Filmography.test.tsx      # CRÉÉ
│       └── hooks/
│           └── api/
│               ├── useTitleCredits.test.ts           # CRÉÉ
│               ├── useTitleRecommendations.test.ts   # CRÉÉ
│               ├── useSeasons.test.ts                # CRÉÉ
│               ├── useSeason.test.ts                 # CRÉÉ
│               ├── useEpisode.test.ts                # CRÉÉ
│               ├── useEpisodeCredits.test.ts         # CRÉÉ
│               └── usePersonRecommendations.test.ts  # CRÉÉ
└── cypress/
    └── e2e/
        └── detail-pages.cy.ts              # CRÉÉ
```

---

## Plan d'implémentation

1. Créer le document de contexte (`docs/phase-frontend-3.0-detail-pages.md`).
2. Ajouter les nouveaux types dans `lib/types/api.ts`.
3. Créer les hooks API (7 nouveaux hooks).
4. Créer les composants (9 nouveaux composants + index.ts).
5. Implémenter les pages (4 pages).
6. Écrire les tests unitaires (Jest + RTL).
7. Écrire les scénarios Cypress e2e.
8. Valider : `next build`, `next lint`, `prettier --check`, `jest`.
9. Mettre à jour la documentation (roadmap, TECHNICAL_DETAILS, ARCHITECTURE_OVERVIEW).
10. Commit atomique (Conventional Commits) + sync.
