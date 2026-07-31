# Bug 41 — Déconnexions intempestives (routes manquantes + état d'auth non réhydraté)

Statut : **terminé, validé manuellement** (voir `docs/bugs.md` #41).
(Le travail précédent sur les bugs #27-#32, #40 reste terminé, voir `docs/bugs.md`.)

## Symptôme rapporté

Déconnexions impromptues très fréquentes, en particulier en essayant d'accéder à
une page qui n'existe pas encore (Watchlist, Historique) — et dans ce cas le
redirect ne fonctionnait pas comme attendu.

## Cause racine (deux problèmes cumulés)

1. `/watchlist` et `/history` n'avaient pas de `page.tsx` → 404 rendue par
   `app/not-found.tsx`, **hors** du layout `(frontend)` → Sidebar/Header
   disparaissent complètement, ce qui ressemble à une déconnexion.
2. `useAuthStore` (Zustand) ne vit qu'en mémoire, sans bootstrap au chargement
   de l'app. Après un rechargement complet, le store repart à zéro même si le
   cookie `emdb_access_token` est encore valide → les pages qui vérifient
   `isAuthenticated` (Calendrier, Listes) affichent "Connectez-vous..." alors
   que l'utilisateur est bien connecté.

## Steps

- [x] 1. Reproduit en conditions réelles (navigateur + dev server) : confirmé
      les deux causes ci-dessus indépendamment.
- [x] 2. Ajouté `useAuthBootstrap` (`apps/web/src/hooks/auth/useAuthBootstrap.ts`),
      appelé dans `app/layout.tsx` : relit le cookie au montage, réhydrate le
      store via `GET /auth/me` si besoin.
- [x] 3. `CalendarPage` et `ListsPage` gèrent l'état `isLoading` du store avant
      d'afficher "Connectez-vous...".
- [x] 4. Créé les pages minimales manquantes `/watchlist` et `/history` dans le
      layout `(frontend)`.
- [x] 5. Trouvé un 3e cas de la même classe de bug : la page d'accueil liait
      "Visionnages" et "Voir tout l'historique" vers `/watches` (route jamais
      créée, 404). Corrigé vers `/history` (`apps/web/src/app/(frontend)/page.tsx`).
- [x] 6. Vérifié dans le navigateur (compte de test) : `/calendar` et `/lists`
      affichent le contenu authentifié après un rechargement complet ;
      `/watchlist` et `/history` chargent normalement avec Sidebar/Header.
- [x] 7. `npx tsc --noEmit` : aucune nouvelle erreur introduite (erreurs
      préexistantes dans des fichiers de tests, non liées à ce fix).
- [x] 8. Validation manuelle par l'utilisateur.
- [x] 9. Documentation mise à jour : `docs/bugs.md` (#41), `docs/emdb_roadmap_frontend.md`.
- [x] 10. Bug distinct découvert et documenté (non corrigé) : `docs/bugs.md` #42 —
      listes en double sur `/lists` et le module listes du profil.

## Note

`/dataviz` n'est pas une route séparée : c'est une section de `/profile`, déjà
en place avec un état "à venir" — pas de page dédiée à créer.
