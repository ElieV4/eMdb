export type TmdbEpisodeCreditCast = {
  id: number;
  name: string;
  character: string;
  order: number;
};
export type TmdbEpisodeCreditCrew = {
  id: number;
  name: string;
  job: string;
  department: string;
};
export type TmdbEpisodeCredits = {
  id: number;
  crew: TmdbEpisodeCreditCrew[];
  guest_stars: TmdbEpisodeCreditCast[];
};
export type TmdbCreditCast = {
  id: number;
  name: string;
  character?: string | null;
  order?: number | null;
};
export type TmdbCreditCrew = {
  id: number;
  name: string;
  job: string;
  department?: string | null;
};
export type TmdbCredits = {
  cast?: TmdbCreditCast[];
  crew?: TmdbCreditCrew[];
};
export type EpisodeCreditInsert = {
  tmdb_person_id: number;
  role: 'acteur' | 'realisateur' | 'scenariste' | 'autre';
  personnage?: string;
  ordre?: number;
  episode_id: string;
  source: 'tmdb';
};
export type TmdbExternalIds = {
  imdb_id?: string | null;
  wikidata_id?: string | null;
  [key: string]: string | number | null | undefined;
};
export type TmdbGenre = {
  id: number;
  name: string;
};
export type TmdbCountry = {
  iso_3166_1: string;
  name: string;
};
export type TmdbMovieDetails = {
  id: number;
  title: string;
  original_title: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  poster_path?: string | null;
  genres?: TmdbGenre[];
  production_countries?: TmdbCountry[];
};
export type TmdbTvDetails = {
  id: number;
  name: string;
  original_name: string;
  overview?: string;
  first_air_date?: string;
  episode_run_time?: number[];
  vote_average?: number;
  poster_path?: string | null;
  genres?: TmdbGenre[];
  production_countries?: TmdbCountry[];
  status?: string;
  next_episode_to_air?: {
    air_date?: string;
  } | null;
  credits?: TmdbCredits;
};
export type TmdbSeasonDetails = {
  season_number: number;
  name?: string;
  air_date?: string;
  overview?: string;
  episodes?: TmdbEpisodeDetails[];
};
export type TmdbEpisodeDetails = {
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string;
  runtime?: number;
  still_path?: string;
};
export type TmdbPersonDetails = {
  id: number;
  name: string;
  gender?: number;
  birthday?: string | null;
  place_of_birth?: string | null;
  profile_path?: string | null;
  biography?: string | null;
};
export type TitleInsert = {
  tmdb_id: number;
  type: 'film' | 'serie';
  titre_vo: string;
  titre_vf: string;
  synopsis: string | null;
  date_sortie: Date | null;
  duree_minutes: number | null;
  note_imdb: number | null;
  affiche_url: string | null;
  statut_serie: string | null;
  next_episode_air_date: Date | null;
  source: 'tmdb';
};
export type GenreInsert = {
  tmdb_id: number;
  nom: string;
};
export type CountryInsert = {
  code: string;
  nom: string;
};
export type CreditInsert = {
  tmdb_person_id: number;
  role: 'acteur' | 'realisateur' | 'scenariste' | 'autre';
  personnage?: string | null;
  ordre?: number | null;
  title_id: string;
  episode_id?: string | null;
  source: 'tmdb';
};
export type PersonInsert = {
  tmdb_id: number;
  nom: string;
  genre: 'homme' | 'femme' | 'autre';
  date_naissance: Date | null;
  pays_id: string | null;
  photo_url: string | null;
  bio: string | null;
  wiki_url: string | null;
  source: 'tmdb';
};
export type SeasonInsert = {
  title_id: string;
  numero: number;
  titre: string | null;
  date_sortie: Date | null;
  synopsis: string | null;
};
export type EpisodeInsert = {
  season_id: string;
  numero: number;
  titre: string | null;
  synopsis: string | null;
  date_sortie: Date | null;
  duree_minutes: number | null;
  image_url: string | null;
};
export declare function mapTmdbEpisodeCredits(
  tmdbEpisodeCredits: TmdbEpisodeCredits,
  episodeId: string,
): EpisodeCreditInsert[];
export declare function mapTmdbPersonExternalIds(tmdbExternalIds: TmdbExternalIds): {
  imdb_id?: string | null;
  wikidata_id?: string | null;
};
export declare function mapTmdbGenres(tmdbGenres: TmdbGenre[]): GenreInsert[];
export declare function mapTmdbCountries(tmdbCountries: TmdbCountry[]): CountryInsert[];
export declare function mapTmdbCredits(
  tmdbCredits: TmdbCredits | undefined,
  titleId: string,
  episodeId?: string | null,
): CreditInsert[];
export declare function mapTmdbPerson(
  tmdbPerson: TmdbPersonDetails,
  wikiUrl: string | null,
): PersonInsert;
export declare function mapTmdbSeason(tmdbSeason: TmdbSeasonDetails, titleId: string): SeasonInsert;
export declare function mapTmdbEpisode(
  tmdbEpisode: TmdbEpisodeDetails,
  seasonId: string,
): EpisodeInsert;
export declare function mapTmdbMovieToTitle(tmdbMovie: TmdbMovieDetails): {
  tmdb_id: number;
  type: string;
  titre_vo: string;
  titre_vf: string;
  synopsis: string | null;
  date_sortie: Date | null;
  duree_minutes: number | null;
  note_imdb: number | null;
  affiche_url: string | null;
  statut_serie: null;
  next_episode_air_date: null;
  source: 'tmdb';
};
export declare function mapTmdbTvToTitle(tmdbTv: TmdbTvDetails): {
  tmdb_id: number;
  type: string;
  titre_vo: string;
  titre_vf: string;
  synopsis: string | null;
  date_sortie: Date | null;
  duree_minutes: number | null;
  note_imdb: number | null;
  affiche_url: string | null;
  statut_serie: string | null;
  next_episode_air_date: Date | null;
  source: 'tmdb';
};
