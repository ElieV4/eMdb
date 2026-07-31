# Bug 45 — Icônes vu/watchlist/favori non fonctionnelles + repositionnement

Statut : **terminé** (voir `docs/bugs.md` #45, modifications D/I).

## Symptôme rapporté

Sur la page titre, "Marquer comme vu" et "Listes" ne faisaient rien au clic —
donc aucune icone n'apparaissait jamais sur les affiches.

## Cause racine

`WatchButton.tsx` et `TitleActions.tsx` enveloppaient un `<Button>` complet
dans `<DropdownMenuTrigger>` sans la prop `render` (fusion "asChild" de Base
UI) → `<button>` imbriqué dans `<button>`, HTML invalide. Vérifié
empiriquement : ni clic réel ni clic synthétique ne déclenchait `onClick` ou
l'ouverture du menu.

## Steps

- [x] 1. Reproduit : clic réel sur "Marquer comme vu" → aucun `POST /watches`.
- [x] 2. `WatchButton.tsx` : `DropdownMenuTrigger render={<Button>...}` (plus
      de bouton imbriqué) + `onOpenChange` ignore les ouvertures venant du
      déclencheur (seul le clic long ouvre le menu, via `setOpen(true)`
      direct) pour préserver clic simple = action / clic long = menu.
- [x] 3. `TitleActions.tsx` : même fusion `render` sur le bouton "Listes".
- [x] 4. Vérifié : `POST /watches` → 201, bouton passe à "Vu" ; menu "Listes"
      s'ouvre et `POST /lists/:id/items` → 201 en cochant "Favoris".
- [x] 5. Demande utilisateur en cours de route : repositionner les icones en
      haut à gauche, empilées (favori, watchlist, vu) — remplace l'ancien
      binôme bookmark("Suivre")/œil par 3 icones reflétant directement
      watchlist/favoris/vu (résout aussi la modification D sans trancher
      union vs fusion avec "Suivre").
- [x] 6. Backend : `GET /lists` inclut `titleId` dans les items allégés.
- [x] 7. Nouveau hook `useListMembership()` (Sets watchlistIds/favoriteIds,
      dérivés de `useLists()` déjà en cache).
- [x] 8. `TitlePoster.tsx` : props `inWatchlist`/`inFavorites` remplacent
      `followed` ; icones empilées top-left (favori→watchlist→vu), badge de
      type déplacé top-right pour laisser la place.
- [x] 9. Tooltips ajoutés sur les 3 icones (modification I) — nouveau
      composant `apps/web/src/components/ui/tooltip.tsx`.
- [x] 10. Tous les consommateurs de `TitleCard` migrés (`followed` →
       `inWatchlist`/`inFavorites`) : search, watchlist, lists/[id], accueil,
       profil, ListItemsGrid, ListReorder, Filmography, TitleRecommendations.
- [x] 11. `npx tsc --noEmit` : aucune erreur. `lists.service.spec.ts` : 36
       tests verts (ajout `titleId`). Suite jest complète frontend : 196
       passent, 0 régression (mêmes 10 suites en échec préexistant
       qu'avant, liées à la résolution de module `(frontend)`, sans rapport).
- [x] 12. Vérifié visuellement : `/watchlist` affiche cœur (favori) +
       bookmark (watchlist) + œil (vu) empilés en haut à gauche, tooltip au
       survol de chacun.

- [x] 13. Ajustement final demandé : icone "vu" (œil) en blanc plutôt qu'en
       rouge, pour la distinguer visuellement de l'icone favori (cœur rouge).

## Note

Le mécanisme "Suivre" (`user_follows_serie`, restreint aux séries) reste
inchangé fonctionnellement (calendrier, notifications) — seul son lien avec
l'affichage des icones sur les affiches a été retiré.
