# Processus de traitement d'un bug EMDB

Utilise ce prompt pour traiter **un seul bug à la fois** depuis `docs/bugs.md`, de la documentation à la validation manuelle.

## Workflow obligatoire

1. **Repère le bug**
   - Ouvre `docs/bugs.md`.
   - Choisis le premier bug non encore traité dans la section `## Bugs restants identifiés`.
   - Vérifie qu'il n'est pas déjà marqué comme corrigé.

2. **Analyse**
   - Reproduis le symptôme à partir du message d'erreur exact et du fichier/ ligne indiqués.
   - Ouvre le(s) fichier(s) concerné(s) pour localiser la cause racine.
   - Consulte `docs/ARCHITECTURE_OVERVIEW.md` et `docs/emdb_roadmap_frontend.md` pour vérifier le comportement attendu et les conventions du projet.
   - Identifie précisément les fichiers à modifier.

3. **Correction**
   - Modifie uniquement les fichiers nécessaires pour corriger la cause racine.
   - Ne corrige pas de symptômes voisins non décrits dans le bug en cours.

4. **Documentation du bug dans `docs/bugs.md`**
   - Déplace le bug de la section `## Bugs restants identifiés` vers `## Bugs corrigés`.
   - Complète les champs :
     - `Symptôme`
     - `Cause racine`
     - `Correction`
     - `Fichiers modifiés`
     - `Tests unitaires à créer`
   - Si le bug contient plusieurs erreurs liées, regroupe-les sous une seule entrée.

5. **Implémentation du test**
   - Crée ou complète le test unitaire associé dans le workspace adapté (`apps/web/src/__tests__/...` pour le frontend, `packages/...` pour le backend).
   - Le test doit couvrir la casse d'erreur documentée dans le bug.
   - Documente le test dans `docs/TECHNICAL_DETAILS.md` :
     - Nom du fichier de test
     - Cas testé
     - Commande d'exécution

6. **Exécution du test**
   - Lance le test et vérifie qu'il passe.
   - Si le test échoue, corrige l'implémentation ou le test avant de continuer.

7. **Commit**
   - Rédige un message de commit explicite qui liste les fichiers modifiés et la correction apportée.
   - **Ne push pas et ne demande pas la validation avant d'avoir présenté le résumé ci-dessous.**

## Format de validation à présenter

Une fois le bug corrigé, testé et commité localement, présente ce résumé :

```
Bug #X — [Titre]
- Fichiers modifiés : ...
- Correction : ...
- Test : ...
- Commit : ...

Validation demandée : ok pour push ?
```

## Règles

- Un bug à la fois.
- Ne merge pas vers `origin/main` sans validation explicite.
- Ne crée pas de PR sans validation explicite.
- Si un bug nécessite une décision d'architecture non documentée, arrête-toi et demande avant de coder.
