# Modification H — Menu contextuel "⋮" sur les affiches

Statut : **terminé** (voir `docs/bugs.md` modification H).

## Demande

Sur les affiches de titres, quel que soit le module, bouton "⋮" en haut à
droite avec dropdown contextuel : ajouter/retirer de la watchlist ; marquer
comme vu (avec choix de date) / retirer de l'historique.

## Steps

- [x] 1. Nouveau composant `TitleQuickActionsMenu.tsx`, réutilise les hooks
      existants (`useAddItem`/`useRemoveItem`, `useCreateWatch`/
      `useDeleteAllWatches`, `useListMembership`).
- [x] 2. Contrainte structurelle : le bouton ne peut pas être imbriqué dans
      le `<Link>` de la carte (même classe de bug que #45). `TitleCard`/
      `TitleCardHorizontal` restructurés : menu rendu en frère du `<Link>`,
      positionné par-dessus en absolu (pas de navigation accidentelle).
- [x] 3. `TitlePoster` : badge de type déplacé en bas-droite (laisse la place
      au bouton "⋮" en haut-droite).
- [x] 4. `useListMembership()` étendu pour exposer `watchlistId`/`favorisId`
      (nécessaires pour appeler addItem/removeItem depuis le menu).
- [x] 5. Bug connexe trouvé et corrigé : `useCreateWatch`/`useDeleteWatch`/
      `useDeleteAllWatches` n'invalidaient pas `["watched-titles-set"]` —
      l'icone "vu" ne se mettait à jour qu'après reload complet (affectait
      aussi l'ancien `WatchButton`, pas seulement ce nouveau menu).
- [x] 6. `TitleCard.test.tsx` : ajout d'un `QueryClientProvider` autour des
      rendus (désormais nécessaire, `TitleQuickActionsMenu` utilise
      `useQuery`) — régression de test détectée et corrigée avant commit.
- [x] 7. `npx tsc --noEmit` : aucune erreur. Suite jest complète : 196
      passent, 0 régression (même baseline de 10 suites en échec
      préexistant, sans rapport).
- [x] 8. Vérifié dans le navigateur : bouton "⋮" sur `/search` et
      `/watchlist` — ouverture sans navigation, contenu contextuel correct,
      retrait watchlist + marquer/retirer "vu" fonctionnent et se reflètent
      immédiatement sur l'affiche (sans rechargement, grâce au point 5).
- [x] 9. Ajustement demandé après premier retour : le bouton "⋮", positionné
      par rapport au wrapper de carte (bloc, s'étire à la largeur de la
      cellule de grille), atterrissait hors de l'affiche sur les écrans
      larges — cellule de grille plus large que l'affiche (150/200px fixes).
      Corrigé en fixant la largeur du wrapper à celle de l'affiche
      (`posterWidth`), symétrique avec les icones de gauche qui sont
      naturellement alignées (rendues à l'intérieur du propre conteneur de
      `TitlePoster`). Vérifié à 1400px de large : bouton bien à l'intérieur
      des bords de l'affiche.

## Reste du backlog (documenté, pas implémenté)

- Modification G : page "Découvrir" (tendances/populaires/attendus/sorties)
  — nécessite de trancher la source de données pour "Attendus" (pas
  d'équivalent direct côté TMDB).
- Modification J (nouvelle) : refonte Historique & Calendrier — module
  accueil en liste avec badge de date relative, page dédiée façon widget
  Outlook Android (filtre de période + groupement).
