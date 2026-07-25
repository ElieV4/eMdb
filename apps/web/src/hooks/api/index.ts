/**
 * Index des hooks API pour le frontend eMDB.
 * Exporte tous les hooks de la phase 2.
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
