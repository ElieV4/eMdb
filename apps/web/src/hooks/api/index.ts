/**
 * Index des hooks API pour le frontend eMDB.
 * Exporte tous les hooks des phases 2 et 3.
 */

export {
  useTitles,
  useTitle,
  useTrendingTitles,
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
