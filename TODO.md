# Bug #41 (suite) — rafraîchissement silencieux du token expiré

Statut : **terminé** (voir `docs/bugs.md` bug #41, section "Suite").

## Contexte

Après le commit de la modification M et la correction de l'affichage de
la date inconnue (01-01-1900 visible au lieu du libellé "Date inconnue"),
l'utilisateur a signalé : "des fois les boutons fonctionnalités
utilisateurs cessent de fonctionner, et j'ai l'impression que c'est parce
que l'utilisateur est deco ? pas sur mais dcp change la date, commit sync
et après gère ce pb".

## Diagnostic

- Token d'accès JWT : expire après **15 min** (`auth.module.ts`).
- Refresh token (7j) obtenu au login et stocké dans le store Zustand, mais
  **jamais utilisé** — `apiFetch` renvoyait juste une erreur sur 401.
- Aucun hook de mutation n'a de gestion d'erreur dédiée → un 401 après
  15 min de session ouverte échoue en silence, sans toast ni redirection.
- `isAuthenticated` du store Zustand n'était jamais réinitialisé sur 401 :
  l'interface continuait d'afficher un utilisateur connecté.
- Bug annexe : seul le cookie d'accès (15 min) existait ; le refresh token
  ne vivait qu'en mémoire, perdu à chaque F5 — même avec un
  rafraîchissement automatique, la session n'aurait pas survécu à un
  rechargement passé 15 min.

## Steps

- [x] 1. `lib/auth/authCookie.ts` (nouveau) : centralise les cookies
      d'auth (dupliqués avant dans `useLogin`/`useRegister`/
      `useAuthBootstrap`), ajoute un cookie `emdb_refresh_token` (7j).
- [x] 2. `lib/api/apiClient.ts` : sur 401 (hors endpoints auth eux-mêmes),
      appelle `POST /auth/refresh`, met à jour store + cookies, rejoue la
      requête une fois. 401 concurrents dédupliqués sur la même promesse
      de refresh (le refresh token tourne à chaque appel côté backend).
      Échec du refresh → déconnexion propre (`logout()` + cookies nettoyés).
- [x] 3. `useAuthBootstrap.ts` : gère aussi "cookie d'accès expiré mais
      cookie de refresh valide" (rappelle `/auth/refresh` au montage), et
      réhydrate systématiquement le refresh token dans le store.
- [x] 4. `useLogout.ts` : nettoie aussi le cookie de refresh (sinon une
      déconnexion explicite était annulée par `useAuthBootstrap` au
      chargement suivant).
- [x] 5. `tsc --noEmit` (web) : aucune erreur. `jest` : 200/209 passent,
      baseline strictement inchangée (10 suites en échec, préexistantes).
- [x] 6. Vérifié la séquence complète en conditions réelles (pas
      seulement via tsc/jest) : requête avec token expiré → 401 → refresh
      avec le vrai refresh token du cookie → 201 avec nouveau token →
      requête rejouée → 200. Session confirmée persistante après
      rechargement complet de page.
- [x] 7. `docs/bugs.md` bug #41 : section "Suite" ajoutée avec le
      diagnostic complet et la vérification.

## Reste du backlog

- `docs/bugs.md` bug #34 (menu filtre header, curseur Durée) : retiré du
  fichier et code annulé sur demande de l'utilisateur.
- Bugs #46-52 (hors #35, déjà résolu via la modification M) et
  modifications N-U : non implémentés, en attente de priorisation.
- Prochaine modification lettrée non faite : **N** (sidebar indentée).
