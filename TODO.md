# Bugs 29 & 30 — Icones vu / bookmark manquantes sur les affiches

Statut : **terminé** (voir `docs/bugs.md` #29 et #30).
(Le travail précédent sur les bugs #27 et #28 reste terminé, voir `docs/bugs.md`.)

## Constat de départ

`TitlePoster.tsx` et `TitleCard.tsx` avaient déjà les props `watched`/`followed` et le
rendu des icones (Eye rouge / Bookmark) implémentés dans une session antérieure, ainsi
que les hooks `useWatchedTitles()`/`useFollowedTitleIds()`. Mais **aucun des 7 call sites
de `<TitleCard>` dans l'app ne les utilisait** — scaffolding jamais branché.

## Steps

- [x] 1. Recherche exhaustive de tous les call sites `<TitleCard>` (agent Explore) :
      `Filmography.tsx`, `search/page.tsx`, `profile/page.tsx`, `TitleRecommendations.tsx`,
      `ListReorder.tsx`, `(frontend)/page.tsx` (x3 sections), `ListItemsGrid.tsx`
- [x] 2. `TitleCard.tsx` : `TitleCardHorizontal` accepte et transmet maintenant
      `watched`/`followed` à `TitlePoster` (ne le faisait pas du tout)
- [x] 3. Câblage de `useWatchedTitles()`/`useFollowedTitleIds()` + props dans les 7 call sites
- [x] 4. Fix : `TitleRecommendations.tsx` — ajout de `"use client"` (nécessaire dès qu'il
      utilise des hooks ; absence faisait échouer `next build` via le barrel `@/hooks/api`)
- [x] 5. Bug annexe : `useWatchedTitles()` demandait `limit=500` à `GET /watches`, DTO
      plafonne à 100 → 400 systématique → corrigé en `limit=100`
- [x] 6. Bug annexe : `useFollowedTitleIds()` lisait `follow.title_id`, mais `GET /follows`
      renvoie `id` directement (pas d'enveloppe) → corrigé
- [x] 7. Build & test
  - Type-check frontend ✅ (aucune nouvelle erreur)
  - Build production ✅ (`next build`)
  - Testé manuellement : "The Martian" (vu) → icone œil rouge ; "House of the Dragon"
    (suivie) → icone bookmark — confirmés visuellement et via inspection des props React

## Hors scope (décision)

`FollowedSeriesGrid.tsx` n'utilise pas `TitleCard`/`TitlePoster` (layout en ligne fait
main, déjà un `FollowButton` explicite) — pas retouché, valeur ajoutée marginale.

## Suivi

Les deux bugs annexes découverts (`GET /watches` limit trop haut, `GET /follows` champ
`id` vs `title_id`) sont documentés inline dans `docs/bugs.md` #29/#30 plutôt que comme
bugs séparés, car ils étaient internes aux hooks jamais utilisés — pas de régression
visible pour un utilisateur avant ce fix.
