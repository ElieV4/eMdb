# Bug 42 — Les listes apparaissent en double

Statut : **terminé, validé manuellement** (voir `docs/bugs.md` #42).
(Le travail précédent sur les bugs #27-#32, #40, #41 reste terminé, voir `docs/bugs.md`.)

## Cause racine (deux origines cumulables)

1. `useRegister()` (`apps/web/src/hooks/auth/useRegister.ts`) crée "Ma Watchlist"
   et "Mes Favoris" via `createList.mutate(...)` dans son `onSuccess`. Confirmé
   par instrumentation (`console.log` + réseau) : pour un seul `POST
   /auth/register`, `onSuccess` s'exécute deux fois à la même milliseconde
   côté client (artefact dev-only, probable React 18 Strict Mode). Aucune
   garde d'idempotence côté backend.
2. `ListDialog.tsx` ("Créer une liste") proposait un sélecteur de type avec
   "Watchlist" en valeur par défaut — validable par erreur, créant une
   deuxième liste `watchlist`. Constaté sur un compte réel : 3 listes
   `watchlist` au lieu d'une.

## Steps

- [x] 1. Requêté la base (`packages/db`, script temporaire + Prisma) pour
      confirmer la duplication réelle (4 lignes dupliquées, 2 comptes).
- [x] 2. Instrumenté `useRegister.onSuccess` avec un `console.log` temporaire,
      reproduit une inscription : confirmé `onSuccess` appelé deux fois pour
      un seul `POST /auth/register` (log retiré après diagnostic).
- [x] 3. Backend : `ListsService.createList()` rendu idempotent pour
      `watchlist`/`favoris` (retourne la liste existante au lieu d'en créer
      une deuxième).
- [x] 4. Découverte en cours de nettoyage : une 3e liste `watchlist` dupliquée
      sur le compte réel de l'utilisateur, provenant de `ListDialog.tsx`
      (type "Watchlist" par défaut, sélectionnable manuellement). Confirmé
      avec l'utilisateur qu'il s'agit de données de test, pas de perte réelle.
- [x] 5. Frontend : suppression du sélecteur de type dans `ListDialog.tsx` —
      seules les listes personnalisées sont créables depuis ce formulaire.
- [x] 6. Nettoyé les doublons existants en base (conservé la liste avec le
      plus d'items par paire dupliquée).
- [x] 7. Vérifié : nouvelle inscription de test → une seule "Ma Watchlist" /
      "Mes Favoris" ; formulaire "Créer une liste" ne propose plus que
      Nom/Description.
- [x] 8. `npx tsc --noEmit` : aucune nouvelle erreur.

## Hors scope (non corrigé)

La cause exacte du double déclenchement de `onSuccess` dans `useRegister()`
(probable artefact React Strict Mode / dev only) n'a pas été éliminée à la
source — seul son effet (duplication en base) est neutralisé par
l'idempotence backend. Un `POST /lists` redondant continue de partir à
l'inscription, sans conséquence utilisateur visible.
