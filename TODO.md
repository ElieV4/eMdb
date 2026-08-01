# Modification C — Liste unique dédupliquée + filtre rôle multi-sélection

Statut : **terminé** (voir `docs/bugs.md` modification C).

## Contexte

Après le bug #34 (menu filtre du header), l'utilisateur a jugé ce bug peu
clair, a demandé de le retirer du fichier et d'annuler les changements de
code associés (fait — voir historique), puis a demandé d'enchaîner sur la
première **modification** (pas bug) non faite de `docs/bugs.md`. Dans
l'ordre du document, ce sont A puis B — mais leur propre texte indique
qu'elles sont remplacées/fusionnées par **C**, qui est donc la modification
réellement actionnable.

## Demande (modification C)

Remplacer l'affichage actuel des modules "Distribution & Équipe" (page
titre) et "Filmographie" (page personne) — plusieurs listes séparées par
rôle — par une liste unique de valeurs distinctes (une personne ou un titre
n'apparaît qu'une fois même avec plusieurs rôles), avec le ou les rôles en
badge sur chaque élément, et un filtre par rôle en haut sous forme de
boutons multi-sélectionnables.

## Steps

- [x] 1. `apps/web/src/lib/creditGrouping.ts` (nouveau) : `dedupeGroupedByEntity()`
      générique, applicable à `CreditGrouped` et `FilmographyGrouped` (même
      forme `Record<role, item[]>`).
- [x] 2. `TitleCreditsSplit.tsx` réécrit : suppression du découpage
      Distribution/Équipe technique et de `CREW_ROLES` (constante EN cassée
      — ne matchait jamais les libellés FR stockés en base, donc tout le
      monde atterrissait dans "Distribution", y compris les réalisateurs).
      Liste unique + filtre rôle (boutons, "Tout" + un par rôle présent) +
      badge de rôle(s) par personne sur `PersonBadge`.
- [x] 3. `Filmography.tsx` réécrit : même traitement pour les titres (dédup
      par `titre.id`), filtre rôle local en plus des filtres d'attribut
      header (type/année/genre/pays/note, toujours actifs par ailleurs).
      Badges de rôle sous chaque `TitleCard`.
- [x] 4. `Filmography.test.tsx` adapté (`getByText` → `getAllByText`, un
      rôle apparaît maintenant deux fois : bouton de filtre + badge).
- [x] 5. `tsc --noEmit` (web) : aucune erreur. `jest` (web) : 196 passent,
      baseline strictement inchangée (10 suites en échec, toutes
      pré-existantes — confirmé en isolant les changements via `git stash`
      et en re-testant sur le code déjà commité : mêmes échecs à
      l'identique, dont `Filmography.test.tsx` lui-même, qui échouait déjà
      avant cette modification pour une raison indépendante
      — `useSearchParams()` renvoie `null` dans cet environnement de test).
- [x] 6. Vérifié en navigateur, sur un titre réel (Dune: Part Two,
      importé cette session) : le module "Distribution & Équipe" affiche
      désormais correctement tous les rôles (Réalisateur, Scénariste,
      Producteur, etc. — avant ce correctif, Denis Villeneuve apparaissait
      comme un simple acteur de plus). Filtrer sur "Réalisateur" affiche
      une seule carte dédupliquée "Denis Villeneuve — Producteur •
      Scénariste • Réalisateur". Page personne (Denis Villeneuve) : "Dune:
      Part Two" apparaît une fois avec ses 3 badges de rôle. Page studio
      (Legendary Pictures, réutilise `Filmography`) : aucune régression.
- [x] 7. `docs/bugs.md` : A et B marqués comme remplacés par C, C marquée
      "✅ fait" avec détails + note sur le bug pré-existant (non corrigé,
      hors périmètre) de `useSearchParams()` renvoyant `null` en test,
      qui affecte aussi `PersonCard`/`TitleActions`/`TitleRecommendations`/
      `TitleCard` (mêmes suites déjà en échec avant cette session).

## Reste du backlog

- `docs/bugs.md` bug #34 (menu filtre header, curseur Durée) : retiré du
  fichier et code annulé sur demande de l'utilisateur — à reprendre
  éventuellement plus tard sous une forme mieux comprise.
- Bugs #35, #46-52 et modifications G, M-U : non implémentés, en attente
  de priorisation (l'utilisateur a dit "on reviendra sur les bugs plus
  tard" — focus resté sur les modifications lettrées pour l'instant).
