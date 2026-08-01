# Modification O — menu Filtres : repositionnement, réordonnancement, multi-sélection

Statut : **terminé** (voir `docs/bugs.md` modification O).

## Contexte

Après la modification N (sidebar), l'utilisateur a demandé de passer à la
modification O — mais avec une précision qui va bien au-delà de l'entrée
originale du backlog ("remonter le filtre type en haut du menu filtre") :
repositionnement dynamique du filtre par type entre le header et le
panneau, réordonnancement complet des contrôles, ajout d'un filtre "date de
visionnage" sur l'historique, dropdowns multi-sélection avec "Tout
sélectionner", header filtre partout sauf login/register, et retrait de
l'icône profil du header au profit d'un bouton Déconnexion dédié sur la
page Profil.

## Steps

- [x] 1. `Header.tsx` : grille 3 colonnes pour un centrage réel du filtre
      par type (indépendant de la largeur des actions de droite) ; le bloc
      central ne se rend que si le panneau Filtres est fermé. Nouveau
      composant partagé `TypeFilterTabs.tsx` (header desktop, menu mobile,
      panneau filtres — même rendu partout).
- [x] 2. Suppression de la restriction `FILTER_VISIBLE_PATHS` : header
      filtre visible sur toutes les pages (déjà structurellement absent de
      login/register via le layout `(auth)` séparé).
- [x] 3. `FilterSidebar.tsx` réordonné : Type → Statut → Année de sortie →
      Date de visionnage (si `/history`) → Note IMDB → Genre → Pays →
      Listes. Label "Région (pays)" → "Pays".
- [x] 4. Nouveau sous-composant `MultiSelectDropdown` (Genre/Pays/Listes) :
      item "Tout sélectionner" en tête de chaque dropdown.
- [x] 5. Nouveau filtre "Date de visionnage" (slider année, même pattern
      que "Année de sortie") sur `/history` uniquement — nouveaux champs
      `watchedYearMin`/`watchedYearMax` dans `titleFilters.ts`
      (`vuAnneeMin`/`vuAnneeMax`), appliqués côté client dans
      `history/page.tsx`.
- [x] 6. Dropdown utilisateur (icône, Profil, Déconnexion) retiré de
      `Header.tsx` ; bouton "Déconnexion" ajouté en haut à droite de
      `profile/page.tsx` (même pattern `useLogout` + redirection).
- [x] 7. `tsc --noEmit` (web) : aucune nouvelle erreur. `jest` web :
      200/209, baseline strictement inchangée.
- [x] 8. Vérifié en direct dans le navigateur : centrage du filtre type,
      relocalisation ouverture/fermeture du panneau, ordre des contrôles,
      "Date de visionnage" limité à `/history`, "Tout sélectionner"
      fonctionnel (27 genres peuplés dans l'URL), header présent sur
      plusieurs pages non listées avant, aucune icône profil résiduelle,
      bouton Déconnexion fonctionnel sur `/profile`.
- [x] 9. `docs/bugs.md` modification O : passée à "✅ fait" avec le détail
      complet.

## 2ème passe (retour utilisateur "avant de commit")

Une fois le header visible partout, l'utilisateur a signalé que les
filtres restaient cosmétiques sur plusieurs modules "ligne + slider" qui
ne les consommaient pas.

- [x] 10. `titleFilters.ts` : `FilterableTitle.year`/`note`/`genreIds`/
       `countryIds` acceptent `undefined` ("non calculable ici, ignorer ce
       filtre"), distinct de `null`/`[]` ("calculé, effectivement vide").
       `titleMatchesFilters` ignore les champs `undefined`. Callers
       existants inchangés (calculent toujours une vraie valeur).
- [x] 11. `DiscoverModuleSection.tsx` (`/discover` + `/discover/[module]`) :
       filtre type/année/note/statut/listes. Genre/pays non applicables —
       TMDB trending/discover ne porte pas nos ids locaux de genre/pays
       (limitation documentée, changement backend nécessaire si besoin).
- [x] 12. `TitleRecommendations.tsx` : filtre type/note/statut/listes.
       Année/genre/pays non applicables — `TitleRecommendation` ne porte
       aucune de ces données.
- [x] 13. `profile/page.tsx` (Favoris) : filtre complet (les items de
       `GET /lists/:id` portent déjà genres/pays), aucune limitation.
- [x] 14. `page.tsx` (accueil) : même correction sur "Recommandés" et
       "Titres populaires" (invités), qui ne filtraient pas du tout
       jusqu'ici — filtre complet (source `Title[]`).
- [x] 15. `tsc --noEmit` + `jest` : baseline strictement inchangée (deux
       passes confondues).
- [x] 16. Vérifié en direct : `/discover?noteImdbMin=8` 40→21 résultats,
       `/discover/tendances?noteImdbMin=8` (grille) 21→17, `/profile?type=serie`
       et page titre `?type=serie` affichent bien les messages "aucun
       résultat ne correspond aux filtres actifs".
- [x] 17. `docs/bugs.md` modification O : section "2ème passe" ajoutée.
- [x] 18. Limitation Genre/Pays (Découvrir) et Année/Genre/Pays (Titres
       recommandés) documentée comme bug #53 dans `docs/bugs.md`, avec
       correction proposée (mapping `genres.tmdb_id`, extension backend).

## Reste du backlog

- `docs/bugs.md` bug #34 (menu filtre header, curseur Durée) : retiré du
  fichier et code annulé sur demande de l'utilisateur.
- `docs/bugs.md` bug #53 (Genre/Pays inopérants sur Découvrir/Titres
  recommandés) : documenté, non corrigé (nécessite un changement backend).
- Modification S (menu trois points listes, précisée) et modification V
  (module "Recommandés pour cette liste" + Favoris en ligne+slider +
  compteur d'éléments) : documentées, non implémentées.
- Bugs #46-52 (hors #35, déjà résolu via la modification M) et
  modifications P-U : non implémentés, en attente de priorisation.
- Prochaine modification lettrée non faite : **P** (filtre Studio sur la
  page recherche).
