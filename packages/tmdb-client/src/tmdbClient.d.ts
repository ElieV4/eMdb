export type TmdbSearchResult = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
};
export type TmdbConfig = {
  images: {
    base_url: string;
    secure_base_url: string;
    backdrop_sizes: string[];
    logo_sizes: string[];
    poster_sizes: string[];
    profile_sizes: string[];
    still_sizes: string[];
  };
};
export declare function searchMovie(query: string, year?: number): Promise<TmdbSearchResult[]>;
export declare function searchTv(query: string, year?: number): Promise<TmdbSearchResult[]>;
export declare function searchPerson(query: string): Promise<TmdbSearchResult[]>;
export declare function searchMulti(query: string): Promise<TmdbSearchResult[]>;
export declare function getConfiguration(): Promise<TmdbConfig>;
export declare function getMovieDetails(tmdbId: number): Promise<any>;
export declare function getTvDetails(tmdbId: number): Promise<any>;
export declare function getTvSeason(tmdbId: number, seasonNumber: number): Promise<any>;
export declare function getPersonDetails(personTmdbId: number): Promise<any>;
export declare function getPersonCombinedCredits(personTmdbId: number): Promise<any>;
export declare function getGenreListMovie(): Promise<any>;
export declare function getGenreListTv(): Promise<any>;
export declare function getMovieExternalIds(tmdbId: number): Promise<any>;
export declare function getTvExternalIds(tmdbId: number): Promise<any>;
export declare function getPersonExternalIds(personTmdbId: number): Promise<any>;
export declare function getTvEpisodeDetails(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<any>;
export declare function getMovieImages(tmdbId: number): Promise<any>;
export declare function getTvImages(tmdbId: number): Promise<any>;
export declare function getPersonImages(personTmdbId: number): Promise<any>;
export declare function getMovieVideos(tmdbId: number): Promise<any>;
export declare function getTvVideos(tmdbId: number): Promise<any>;
export declare function getMovieRecommendations(tmdbId: number): Promise<any>;
export declare function getMovieSimilar(tmdbId: number): Promise<any>;
export declare function getTvRecommendations(tmdbId: number): Promise<any>;
export declare function getTvSimilar(tmdbId: number): Promise<any>;
export declare function getCollectionDetails(collectionId: number): Promise<any>;
export declare function getTrending(
  mediaType: 'movie' | 'tv' | 'person',
  timeWindow: 'day' | 'week',
): Promise<any>;
export declare function getDiscoverMovie(
  filters: Record<string, string | number | undefined>,
): Promise<any>;
export declare function getDiscoverTv(
  filters: Record<string, string | number | undefined>,
): Promise<any>;
export declare function getChanges(startDate: string, endDate: string): Promise<any>;
