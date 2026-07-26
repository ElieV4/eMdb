# Contexte — Phase 4 Frontend : Fonctionnalités utilisateur

## Décisions architecturales

| Question | Décision |
|---|---|
| 1. Historique watches | Intégré à la page d'accueil (pas de page `/watches` dédiée) |
| 2. Séries suivies | Sur le profil (pas de page `/follows` dédiée) |
| 3. Drag & drop listes | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` |
| 4. WatchButton | Clic simple = vu maintenant ; clic long = menu contextuel (maintenant, date sortie, date personnalisée, inconnue) |
| 5. Listes partagées | Intégré à la page `/lists` avec onglet "Partagées avec moi" |
| 6. Recharts | Non nécessaire pour Phase 4 (réservé Phase 6) |
| 7. Date picker personnalisé | Input `type="date"` natif HTML (pas de lib externe) |

## Pages

| Page | Path | Description |
|---|---|---|
| Calendrier | `/calendar` | Calendrier épisodes non vus des séries suivies |
| Mes notes | `/ratings` | Liste paginée des notes de l'utilisateur |
| Mes listes | `/lists` | Grille de listes + onglet "Partagées avec moi" |
| Détail liste | `/lists/[id]` | Détail d'une liste avec items, partage, réordonnancement |

## Pages supprimées (vs roadmap initiale)

| Page roadmap | Décision | Remplacé par |
|---|---|---|
| `/watches` | Supprimée | Section "Activité récente" sur l'accueil |
| `/follows` | Supprimée | Section "Séries suivies" sur le profil |
| `/shared-lists` | Supprimée | Onglet "Partagées avec moi" dans `/lists` |

## Composants

### Module watches
- `WatchButton` — Clic simple = vu instant, clic long = menu avec 4 options
- `WatchHistorySection` — Section d'activité récente pour la page d'accueil
- `WatchHistoryItem` — Item d'historique individuel
- `ProgressSerie` — Barre de progression par saison
- `FollowButton` — Toggle suivre/ne plus suivre
- `FollowedSeriesGrid` — Grille de séries suivies (profil)
- `CalendarEpisodes` — Liste des épisodes non vus (calendrier)

### Module ratings
- `RatingInput` — Étoiles 0-10 avec hover preview et demi-étoiles
- `RatingBadge` — Badge note (ex: 8.5/10)
- `RatingSummary` — Résumé public (moyenne, répartition)
- `CommentaireInput` — Textarea commentaire

### Module lists
- `ListCard` — Card liste (nom, type, nb items)
- `ListDialog` — Dialog création/édition
- `ListItemsGrid` — Grid d'items
- `ListReorder` — Drag & drop réordonnancement
- `ListShareDialog` — Dialog partage
- `ListSharesList` — Liste des partages existants

## Endpoints API consommés

| Hook | Endpoint | Méthode |
|---|---|---|
| `useWatches` | `/watches` | GET |
| `useCreateWatch` | `/watches` | POST |
| `useDeleteWatch` | `/watches/:id` | DELETE |
| `useSerieProgress` | `/titles/:titleId/progress` | GET |
| `useCalendar` | `/calendar` | GET |
| `useFollows` | `/follows` | GET |
| `useFollow` | `/follows` | POST |
| `useUnfollow` | `/follows/:titleId` | DELETE |
| `useUpsertRating` | `/ratings` | PUT |
| `useDeleteRating` | `/ratings/:id` | DELETE |
| `useUserRatings` | `/ratings` | GET |
| `useTitleRatingsSummary` | `/titles/:id/ratings` | GET |
| `useLists` | `/lists` | GET |
| `useList` | `/lists/:id` | GET |
| `useCreateList` | `/lists` | POST |
| `useUpdateList` | `/lists/:id` | PATCH |
| `useDeleteList` | `/lists/:id` | DELETE |
| `useAddItem` | `/lists/:listId/items` | POST |
| `useRemoveItem` | `/lists/:listId/items/:titleId` | DELETE |
| `useReorderItems` | `/lists/:listId/items/reorder` | PATCH |
| `useShares` | `/lists/:listId/shares` | GET |
| `useShareList` | `/lists/:listId/shares` | POST |
| `useRemoveShare` | `/lists/:listId/shares/:userId` | DELETE |
| `useSharedLists` | `/shared-lists` | GET |

## Types à ajouter dans `lib/types/api.ts`

```typescript
// Phase 4 — Watches
export type CalendarEntry = {
  title_id: string;
  titre_vo: string;
  titre_vf: string | null;
  affiche_url: string | null;
  saison: number;
  episode_numero: number;
  episode_titre: string | null;
  date_diffusion: Date | null;
  nb_non_vus: number;
};

export type ProgressSerieResult = {
  saison: number;
  vus: number;
  total: number;
};

export type WatchCreateInput = {
  title_id?: string;
  episode_id?: string;
  date_vue?: string;
};

export type WatchFilters = {
  type?: 'film' | 'serie';
  date_from?: string;
  date_to?: string;
  title_id?: string;
  page?: number;
  limit?: number;
};

// Phase 4 — Ratings
export type TitleRatingsSummary = {
  title_id: string;
  moyenne: number | null;
  count: number;
  repartition: Record<number, number>;
};

export type RatingUpsertInput = {
  title_id?: string;
  episode_id?: string;
  note_perso?: number;
  commentaire?: string;
};

// Phase 4 — Lists
export type ListCreateInput = {
  nom: string;
  type: 'watchlist' | 'favoris' | 'custom';
  description?: string;
};

export type ListUpdateInput = {
  nom?: string;
  description?: string;
};

export type ListItemAddInput = {
  title_id: string;
};

export type ShareListInput = {
  shared_with_user_id: string;
  permission: 'lecture' | 'edition';
};

export type ListDetail = {
  id: string;
  nom: string;
  type: 'watchlist' | 'favoris' | 'custom';
  description: string | null;
  user_id: string;
  created_at: string;
  items: Array<{
    title_id: string;
    position: number | null;
    titles: TitleSearchResult;
  }>;
  shares: Array<{
    shared_with_user_id: string;
    permission: 'lecture' | 'edition';
    shared_at: string;
    users: { id: string; pseudo: string };
  }>;
};
```

## Gestion des états

Tous les composants et pages gèrent :
- **Loading** : Skeleton ou spinner pendant le chargement
- **Error** : Message d'erreur avec bouton retry
- **Empty** : Message + CTA pour les listes/calendrier vides
- **Success** : Affichage des données

## Tests

### Composants critiques (Jest + RTL)
- WatchButton : clic simple (vu instant), clic long (menu 4 options), requête POST
- RatingInput : sélection 0-10, hover preview, demi-étoiles
- RatingSummary : moyenne, répartition, count
- FollowButton : toggle follow/unfollow
- ListCard : affichage nom/type/nb items
- ListDialog : validation, création, édition
- Calendar page : affichage séries suivies, nb_non_vus
- ProgressSerie : affichage par saison, pourcentage

### Scénarios Cypress (à vérifier manuellement)
- Parcours complet : marquer un épisode comme vu → voir la progression mise à jour
- Créer une liste → ajouter des items → réordonnancer → partager
- Noter un titre → voir le résumé public mis à jour
- Suivre une série → voir le calendrier mis à jour

## Critères d'acceptation

1. WatchButton fonctionne en clic simple et clic long
2. Le calendrier affiche les épisodes non vus des séries suivies
3. Les notes peuvent être créées/modifiées/supprimées
4. Le résumé public des notes s'affiche correctement
5. Les listes peuvent être créées/modifiées/supprimées
6. Les items peuvent être ajoutés/retirés/réordonnancés
7. Le partage de listes fonctionne (lecture/édition)
8. Les séries peuvent être suivies/défavorisées
9. La progression série s'affiche correctement
10. Tous les états loading/error/empty sont gérés