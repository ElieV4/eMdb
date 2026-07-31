# Bug 31 — Titres recommandés : URL undefined au clic sur une affiche

Statut : **déjà résolu avant cette session** (non documenté comme tel jusqu'ici).
(Le travail précédent sur les bugs #27, #28, #29, #30 reste terminé, voir `docs/bugs.md`.)

## Constat

`titleRecommendationToSearchResult()` (`apps/web/src/lib/types/api.ts`) a déjà la
correction proposée : `local: !!rec.id`, retombe sur `tmdbId` quand `id` est absent.
Vérifié en navigateur sur "The Odyssey" → aucune URL `/titles/undefined`, tous les
hrefs corrects (`/titles/:uuid` ou `/titles/tmdb/:tmdbId?type=...`).

## Découverte en marge : nouveau bug #40

Cliquer sur un titre recommandé non-local avec un casting important (ex. "Conan the
Barbarian") déclenche un import complet synchrone (`withCredits` par défaut = `true`)
qui dépasse le timeout fixe de 10s d'`apiFetch` → erreur "signal is aborted without
reason". Même pattern de cause racine que le bug #27 avant sa correction. Documenté
dans `docs/bugs.md` #40, **pas corrigé** (pas demandé, scope différent de #31).

## Suivi

- docs/bugs.md : bug #31 déplacé vers "Bugs corrigés" avec la vérification effectuée ;
  section "Bugs à corriger — Page People" supprimée (ne contenait plus que ce bug)
- Nouveau bug #40 documenté, pas implémenté
