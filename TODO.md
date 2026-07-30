# TODO - Header & Sidebar Refactor

## Steps

- [x] 1. Edit `apps/web/src/components/layout/Header.tsx`
  - [x] Make header transparent (remove bg-background/80 backdrop-blur, remove border-b)
  - [x] Add filter tabs in center: tout, film, série (conditionally add personne on /search page)
  - [x] Add filter dropdown menu on right: genre, date de sortie, durée, statut, région (pays), dans vu, dans watchlist
  - [x] Keep user menu on far right
  - [x] Keep mobile menu

- [x] 2. Edit `apps/web/src/components/layout/Sidebar.tsx`
  - [x] Remove TitleSearchBar and "Recherche" section
  - [x] Update nav links to: accueil, recherche, calendrier, watchlist, listes, historique, profil
  - [x] Distribute links evenly in available space

- [x] 3. Verify changes compile and work correctly (only pre-existing test errors remain, Header.tsx unused import fixed)
