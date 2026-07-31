/**
 * Index des hooks API pour le frontend eMDB.
 * Exporte tous les hooks des phases 2 et 3.
 */

export {
  useTitles,
  useTitle,
  useTrendingTitles,
  useTitleGenres,
  useTitleCountries,
  type TitlesSearchParams,
  type TitlesSearchResponse,
} from "./useTitles";

export {
  usePeople,
  usePerson,
  usePersonFilmography,
  usePopularPeople,
  type PeopleSearchParams,
  type PeopleSearchResponse,
  type PersonFilmography,
  type TitleWithRole,
} from "./usePeople";

export {
  useSearch,
  useDebouncedSearch,
  type UnifiedSearchParams,
  type UnifiedSearchResult,
} from "./useSearch";

export {
  useRecentWatches,
  useFollowedSeries,
  useDashboardStats,
  useRecommendations,
  usePopularTitles,
  type DashboardWatch,
  type DashboardFollow,
  type DashboardStats,
} from "./useDashboard";

// Phase 3 — Pages de détail
export { useTitleCredits } from "./useTitleCredits";
export { useTitleRecommendations } from "./useTitleRecommendations";
export { useSeasons } from "./useSeasons";
export { useSeason } from "./useSeason";
export { useEpisode } from "./useEpisode";
export { useEpisodeCredits } from "./useEpisodeCredits";
export { usePersonRecommendations } from "./usePersonRecommendations";

// Phase 4 — Fonctionnalités utilisateur
export { useWatches } from "./useWatches";
export { useCreateWatch } from "./useCreateWatch";
export { useDeleteWatch } from "./useDeleteWatch";
export { useSerieProgress } from "./useSerieProgress";
export { useCalendar } from "./useCalendar";
export { useFollow } from "./useFollow";
export { useUnfollow } from "./useUnfollow";
export { useFollows } from "./useFollows";
export { useUserFollows } from "./useUserFollows";
export { useUpsertRating } from "./useUpsertRating";
export { useDeleteRating } from "./useDeleteRating";
export { useUserRatings } from "./useUserRatings";
export { useTitleRatingsSummary } from "./useTitleRatingsSummary";
export { useLists } from "./useLists";
export { useUserLists } from "./useUserLists";
export { useList } from "./useList";
export { useCreateList } from "./useCreateList";
export { useUpdateList } from "./useUpdateList";
export { useDeleteList } from "./useDeleteList";
export { useAddItem } from "./useAddItem";
export { useRemoveItem } from "./useRemoveItem";
export { useAddListItem } from "./useAddListItem";
export { useRemoveListItem } from "./useRemoveListItem";
export { useReorderItems } from "./useReorderItems";
export { useShares } from "./useShares";
export { useShareList } from "./useShareList";
export { useRemoveShare } from "./useRemoveShare";
export { useSharedLists } from "./useSharedLists";

// Hooks utilitaires pour les icones d'affiche
export { useWatchedTitles } from "./useWatchedTitles";
export { useFollowedTitleIds } from "./useFollowedTitleIds";
export { useListMembership } from "./useListMembership";

// Bug 27 — Rafraîchissement filmographie TMDB
export { useRefreshFilmography } from "./useRefreshFilmography";
