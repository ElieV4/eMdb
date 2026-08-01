# Modification G — Nouvelle page "Découvrir"

Statut : **terminé** (voir `docs/bugs.md` modification G).

## Contexte

Après la modification C (commit `020e96b`), l'utilisateur a demandé
d'enchaîner sur la première modification lettrée non faite du document.
Dans l'ordre : D, E, F sont déjà faites ; G était la première non faite,
avec un point explicitement laissé "à trancher" (source de données pour le
module "Attendus").

## Décision prise (sans repasser par l'utilisateur)

Le document proposait déjà lui-même l'algo de repli à utiliser si aucune
donnée TMDB directe n'existe pour "Attendus" : "titres non sortis triés par
popularité TMDB décroissante". Cette proposition étant déjà une réponse
concrète et implémentable (pas une vraie fourche de design ouverte),
implémenté directement plutôt que de reposer la question.

Décision structurante prise en implémentant : les 4 modules interrogent
TMDB **en direct** (trending/discover), pas la base locale — à la
différence de "Titres populaires" sur l'accueil qui ne liste que les
titres déjà importés. Cohérent avec l'objectif "découverte" : faire
apparaître du contenu externe, importé à la demande au clic (mécanisme
déjà en place, `GET /titles/tmdb/:tmdbId`).

## Steps

- [x] 1. Repéré dans `@emdb/tmdb-client` : `getTrending`, `getDiscoverMovie`,
      `getDiscoverTv` existaient déjà (jamais utilisés côté API) — aucun
      nouveau client TMDB nécessaire.
- [x] 2. Backend `apps/api/src/discover/` (nouveau module) :
      `GET /discover/:module?limit=` (`tendances|populaires|attendus|sorties`).
      Mapping unifié des champs movie/tv (noms différents : `title`/`name`,
      `release_date`/`first_air_date`) + détection `local`/`local_id` par
      lookup batch sur `tmdb_id` (même principe que `TitlesService.searchTitles`).
- [x] 3. Frontend : `hooks/api/useDiscover.ts` + page
      `app/(frontend)/discover/page.tsx` (4 sections, réutilise `TitleCard`
      sans modification — `TitleSearchResult` portait déjà `dateSortie`/
      `note`, simplement jamais peuplés par le mapper de recherche
      existant). Lien "Découvrir" ajouté à la nav du header.
- [x] 4. `tsc --noEmit` (web + api) : aucune erreur. `jest` (web + api) :
      baseline strictement inchangée (196/207 web, 175/181 api — mêmes
      échecs pré-existants qu'avant cette session).
- [x] 5. Vérifié en navigateur avec de vraies données TMDB : les 4 modules
      chargent (Tendances : Spider-Man Brand New Day, House of the
      Dragon... / Attendus : Avengers Doomsday, Dune Part Three... /
      Sorties : ajusté `vote_count.gte` de 1 à 50 en cours de route — sans
      ce seuil, "Sorties" remontait des titres obscurs à une seule note
      parfaite plutôt que de vraies sorties grand public).
- [x] 6. Cliqué sur un titre non-local ("Supergirl") → import déclenché.
      Le premier clic déclenche le bug #35 déjà documenté ("signal is
      aborted", même route `/titles/tmdb/:id?type=` que "Titres
      recommandés") — hors périmètre de cette modification, non corrigé
      ici. Un rechargement confirme l'import réussi (fiche complète,
      studios, distribution dédupliquée). Retour sur `/discover` : la carte
      pointe désormais vers l'id local, confirmant la détection `local`.
- [x] 7. `docs/bugs.md` modification G mise à jour : "✅ fait", décision
      documentée, fichiers modifiés, vérification manuelle.

## Reste du backlog

- Bug #35 (`?type=` cause "operation aborted") : reconfirmé, affecte
  maintenant aussi "Découvrir" en plus de "Titres recommandés" — toujours
  non corrigé.
- `docs/bugs.md` bug #34 (menu filtre header, curseur Durée) : retiré du
  fichier et code annulé sur demande de l'utilisateur — à reprendre
  éventuellement plus tard sous une forme mieux comprise.
- Bugs #46-52 et modifications M-U : non implémentés, en attente de
  priorisation ("on reviendra sur les bugs plus tard").
- Prochaine modification lettrée non faite après G : **M**.
