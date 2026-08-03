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
  useTitleStudios,
  type TitlesSearchParams,
  type TitlesSearchResponse,
} from "./useTitles";

export {
  useDatavizTitleOptions,
  useDatavizActorOptions,
  useDatavizDirectorOptions,
  useDatavizStudioOptions,
  type DatavizFilterOption,
} from "./useDatavizFilterOptions";

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
export { useInfiniteWatches } from "./useInfiniteWatches";
export { useCreateWatch } from "./useCreateWatch";
export { useDeleteWatch } from "./useDeleteWatch";
export { useDeleteAllWatches } from "./useDeleteAllWatches";
export { useDeleteAllWatchesByEpisode } from "./useDeleteAllWatchesByEpisode";
export { useMarkWatchedUntilEpisode } from "./useMarkWatchedUntilEpisode";
export { useSerieProgress } from "./useSerieProgress";
export { useCalendar } from "./useCalendar";
export { useInfiniteCalendar } from "./useInfiniteCalendar";
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
export { useUpdateListItemStatus, type WatchlistItemStatus } from "./useUpdateListItemStatus";
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

// Modification U — Module accueil "Continuer à regarder"
export { useContinueWatching } from "./useContinueWatching";

// Bug #55/#56 — Import depuis Trakt (page Profil)
export {
  useUploadTraktExport,
  useTraktImportStatus,
  type TraktImportStartResponse,
  type TraktImportProgress,
  type TraktImportResult,
  type TraktImportStatus,
} from "./useImportTrakt";
