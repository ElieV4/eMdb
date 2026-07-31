# Suite backlog — bug 44, modifications E et F

Statut : **terminé** (voir `docs/bugs.md`).
(Le travail précédent sur les bugs #27-#32, #33, #40-#43 reste terminé.)

## Bug 44 — Historique : filtre "Série" ne renvoyait aucune donnée

Cause : `WatchesService.listWatches()` filtrait uniquement sur la relation
directe `title_id → titles`, or un visionnage d'épisode (cas normal pour une
série) a `title_id = null`. Filtre étendu avec un `OR` couvrant aussi
`episodes → seasons → titles`.

- [x] Corrigé dans `apps/api/src/watches/watches.service.ts` (`listWatches`)
- [x] Nouveau test dans `watches.service.spec.ts` (28 tests, tous verts)
- [x] Vérifié en direct : watch créé sur un épisode → apparaît bien en
      filtrant "Série" sur `/history`
- [x] Limite connue documentée (non corrigée) : le libellé reste générique
      ("Série — Épisode N"), le nom de la série n'est pas remonté par
      `listWatches()` pour la branche épisode

## Modification E — Retirer le module "Listes" de la page profil

- [x] Section "Gestion des listes" retirée de `profile/page.tsx`
- [x] Section "Favoris" conservée (distincte, non concernée)
- [x] Imports/state devenus inutiles nettoyés (Button, Skeleton, Alert,
      Plus, ListCard, ListDialog, dialogOpen)

## Modification F — Simplifier l'en-tête de l'accueil

- [x] Bloc "Bienvenue, {pseudo}" retiré pour les utilisateurs connectés
- [x] Grille de 4 stats (Visionnages/Notes/Listes/Séries suivies) retirée
- [x] En-tête invité ("Bienvenue sur eMDB" + CTA) conservé, non concerné
- [x] Nettoyage : composant `StatCard` et hook `useFollowedSeries()` devenus
      morts, retirés

## Vérifications finales

- [x] `npx tsc --noEmit` (frontend) : aucune erreur
- [x] Vérifié dans le navigateur : accueil ne montre plus "Bienvenue,
      DebugTester4" ni les 4 cases ; profil ne montre plus "Mes Listes"

## Reste du backlog (documenté, pas implémenté)

- Bug #45 : icônes vu/bookmark non fonctionnelles — à investiguer
- Modification G : page "Découvrir" (tendances/populaires/attendus/sorties)
- Modification H : menu contextuel "⋮" sur les affiches
- Modification I : tooltip au survol des icônes vu/bookmark (dépend de #45)
