# Modification N — sidebar de navigation en hiérarchie indentée

Statut : **terminé** (voir `docs/bugs.md` modification N, y compris la
section "2ème passe" pour les retours utilisateur après la 1ère version).

## Contexte

Après une première implémentation (arbre indenté avec ancres pour les
sous-modules sans page dédiée), l'utilisateur a demandé trois affinages :
1. grossir les items de premier niveau par rapport aux seconds ;
2. centrer l'arbre Recherche→Listes au milieu de la sidebar, avec eMDB fixé
   en haut et Profil fixé en bas ;
3. créer une page dédiée pour chaque module de second niveau qui n'en avait
   pas encore (Recommandés, Tendances/Populaires/Attendus/Sorties).

Puis, dans la foulée : sur les pages de premier niveau (Accueil, Découvrir),
chaque module doit s'afficher en une seule ligne scrollable avec une carte
"Voir davantage" qui mène vers la page dédiée correspondante (où le contenu
peut, lui, s'étaler sur plusieurs lignes).

## Steps

- [x] 1. Style : items de premier niveau en `text-base font-semibold` +
      icône `h-5 w-5` ; sous-items en `text-xs font-normal`, sans icône —
      contraste net entre les deux niveaux.
- [x] 2. Layout : `eMDB` fixé en haut, arbre centré verticalement
      (`flex-1 justify-center`), "Profil" extrait de l'arbre et fixé en bas
      (même composant `TopLevelLink` que les parents, pour un style
      cohérent).
- [x] 3. Nouvelles pages dédiées : `/discover/[module]` (route dynamique,
      un seul fichier pour les 4 modules, `notFound()` si clé inconnue),
      `/recommendations` (nouvelle page, mêmes hooks que le module accueil).
      Les hrefs de la sidebar pointent désormais vers ces pages plutôt que
      vers des ancres.
- [x] 4. Nouveau composant générique `CardSlider` (ligne unique
      `overflow-x-auto` + carte "Voir davantage" optionnelle) ; `Watchlist`,
      `Recommandés` et `Titres populaires` (accueil) migrés de grilles
      multi-lignes tronquées vers ce slider. `DateCardSlider`
      (Historique/Calendrier) réécrit en wrapper de `CardSlider` : le "Voir
      davantage" navigue maintenant vers `/history`/`/calendar` au lieu de
      simplement révéler plus de cartes sur place. `DiscoverModuleSection`
      (nouveau, extrait de `discover/page.tsx`) supporte un `variant="row"`
      (aperçu `/discover`) et `variant="grid"` (pages dédiées).
- [x] 5. `tsc --noEmit` (web) : aucune nouvelle erreur. `jest` web :
      200/209, baseline strictement inchangée après les deux passes.
- [x] 6. Vérifié en direct dans le navigateur : contraste de taille
      premier/second niveau, mise en page haut/centre/bas, `/discover/tendances`
      affiche une grille multi-lignes complète, `/recommendations` accessible
      avec le bon état vide (hook stub).
- [x] 7. `docs/bugs.md` modification N : section "2ème passe" ajoutée avec
      le détail complet.

## Reste du backlog

- `docs/bugs.md` bug #34 (menu filtre header, curseur Durée) : retiré du
  fichier et code annulé sur demande de l'utilisateur.
- Bugs #46-52 (hors #35, déjà résolu via la modification M) et
  modifications O-U : non implémentés, en attente de priorisation.
- Prochaine modification lettrée non faite : **O** (menu Filtres : remonter
  le filtre Film/Série/Tout en haut).
