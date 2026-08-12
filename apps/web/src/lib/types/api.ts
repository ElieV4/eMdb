/**
 * Types API partagés pour le frontend eMDB.
 * Alignés sur les réponses NestJS.
 */

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginationResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type User = {
  id: string;
  email: string;
  pseudo: string;
  avatarUrl?: string;
  createdAt: string;
};

export type AuthenticatedUser = User;

export type Title = {
  id: string;
  tmdbId?: number;
  titre: string;
  titreOriginal?: string;
  type: "film" | "serie";
  dateSortie?: string;
  duree?: number;
  note?: number;
  synopsis?: string;
  afficheUrl?: string;
  backdropUrl?: string;
  statut?: string;
  genres?: Genre[];
  pays?: Country[];
};

export type Person = {
  id: string;
  tmdbId?: number;
  nom: string;
  photoUrl?: string;
  dateNaissance?: string;
  pays?: string;
  biographie?: string;
  wikiUrl?: string;
};

export type Episode = {
  id: string;
  titre: string;
  numero: number;
  dateSortie?: string;
  duree?: number;
  synopsis?: string;
  stillUrl?: string;
  saison?: Season;
};

export type Season = {
  id: string;
  numero: number;
  titre?: string;
  dateSortie?: string;
  synopsis?: string;
  posterUrl?: string;
  episodes?: Episode[];
};

export type Credit = {
  id: string;
  role: string;
  person?: Person;
};

export type Genre = {
  id: string;
  nom: string;
};

export type Country = {
  id: string;
  nom: string;
};

export type UserWatch = {
  id: string;
  date_vue: string;
  title_id: string;
  episode_id: string | null;
  titles?: {
    id: string;
    tmdb_id: number | null;
    titre_vo: string;
    titre_vf: string | null;
    affiche_url: string | null;
    type: string;
  };
  episodes?: {
    id: string;
    numero: number;
    titre: string | null;
    seasons: {
      numero: number;
      titles: {
        id: string;
        tmdb_id: number | null;
        titre_vo: string;
        titre_vf: string | null;
        affiche_url: string | null;
        type: string;
      };
    };
  };
};

/** Titre tel que renvoyé par GET /ratings (forme brute Prisma, pas le
 * TitleSearchResult camelCase des autres endpoints) — utilisé pour le
 * filtrage par type/genre/pays/note/année sur la page /ratings. */
export type RatingTitleSummary = {
  id: string;
  tmdb_id: number | null;
  titre_vo: string;
  titre_vf: string | null;
  affiche_url: string | null;
  type: "film" | "serie";
  date_sortie: string | null;
  note_imdb: number | null;
  title_genres: { genre_id: string }[];
  title_countries: { country_id: string }[];
};

/** Épisode tel que renvoyé par GET /ratings — forme brute (id/numero/titre
 * + season.numero), distincte du type Episode (camelCase, saison complète)
 * utilisé ailleurs. */
export type RatingEpisodeSummary = {
  id: string;
  numero: number;
  titre: string | null;
  season?: { numero: number };
};

export type UserRating = {
  id: string;
  note_perso: number | null;
  commentaire: string | null;
  created_at: string;
  updated_at: string;
  title?: RatingTitleSummary;
  episode?: RatingEpisodeSummary;
};

/** Métadonnées allégées d'un item de liste, suffisantes pour le filtrage par
 * type/genre/pays/année/note et pour savoir si un titre appartient à la liste
 * (`titleId`) — pas les champs d'affichage (cf. `GET /lists`). */
export type ListItemFilterMeta = {
  titleId: string;
  type: "film" | "serie";
  year: number | null;
  note: number | null;
  genreIds: string[];
  countryIds: string[];
  /** Statut de progression dans la watchlist : "en_cours" (défaut), "a_jour", "abandonnee". */
  statut?: "en_cours" | "a_jour" | "abandonnee";
};

export type UserList = {
  id: string;
  nom: string;
  type: "watchlist" | "favoris" | "custom";
  description?: string;
  items?: ListItemFilterMeta[];
  _count?: { list_items: number };
  shares?: ListShare[];
};

export type ListShare = {
  id: string;
  permission: "read" | "write";
  user?: User;
};

export type Notification = {
  id: string;
  type: string;
  lu: boolean;
  message: string;
  createdAt: string;
  episodeId?: string;
  titleId?: string;
};

// ============================================
// Phase 4 — Fonctionnalités utilisateur
// Types alignés sur les réponses NestJS (endpoints Phase 4 backend)
// ============================================

// --- Watches (4.1) ---

export type WatchCreateInput = {
  title_id?: string;
  episode_id?: string;
  date_vue?: string;
};

export type WatchFilters = {
  type?: "film" | "serie";
  date_from?: string;
  date_to?: string;
  title_id?: string;
  episode_id?: string;
  page?: number;
  limit?: number;
};

/** GET /continue-watching (modification U) — le prochain épisode non vu de chaque série suivie */
export type ContinueWatchingEntry = {
  title_id: string;
  titre_vo: string;
  titre_vf: string | null;
  affiche_url: string | null;
  episode_id: string;
  saison: number;
  episode_numero: number;
  episode_titre: string | null;
  total_episodes: number;
  episodes_vus: number;
  episodes_restants: number;
  sort_date: Date | string | null;
};

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

export type WatchAction = "now" | "release" | "custom" | "unknown";

// --- Follows (4.4, intégré dans watches) ---

export type FollowDetail = {
  id: string;
  tmdb_id: number | null;
  titre_vo: string;
  titre_vf: string | null;
  affiche_url: string | null;
  type: string;
  next_episode_air_date: string | null;
  followed_at: string;
};

// --- Ratings (4.2) ---

export type RatingUpsertInput = {
  title_id?: string;
  episode_id?: string;
  note_perso?: number;
  commentaire?: string;
};

export type TitleRatingsSummary = {
  title_id: string;
  moyenne: number | null;
  count: number;
  repartition: Record<number, number>;
};

// --- Lists (4.3) ---

export type ListCreateInput = {
  nom: string;
  type: "watchlist" | "favoris" | "custom";
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
  permission: "lecture" | "edition";
};

export type ListDetail = {
  id: string;
  nom: string;
  type: "watchlist" | "favoris" | "custom";
  description: string | null;
  created_at: string;
  items: Array<
    Title & {
      addedAt: string;
      position: number | null;
      /** Statut de progression dans la watchlist : "en_cours" (défaut), "a_jour", "abandonnee". */
      statut?: "en_cours" | "a_jour" | "abandonnee";
    }
  >;
  // GET /lists/:id ne renvoie pas encore les partages — non implémenté côté backend.
  shares?: Array<{
    shared_with_user_id: string;
    permission: "lecture" | "edition";
    shared_at: string;
    users: { id: string; pseudo: string };
  }>;
};

// ============================================
// Phase 2 - Recherche & Navigation
// ============================================

export type SearchType = "film" | "serie" | "personne";

export type SearchParams = {
  query?: string;
  type?: SearchType;
  genre?: string;
  country?: string;
  year?: number;
  page?: number;
  limit?: number;
};

export type SearchResult<T> = PaginationResult<T> & {
  query: string;
  type: SearchType;
};

export type TitleSearchResult = {
  id: string;
  tmdbId?: number;
  titre: string;
  titreOriginal?: string;
  type: "film" | "serie";
  dateSortie?: string;
  duree?: number;
  note?: number;
  afficheUrl?: string;
  genres?: Genre[];
  pays?: Country[];
  local: boolean;
  /** Studios de production — uniquement renseigné pour les résultats déjà
   * importés localement (filtre "Studio" sur /search, modification P).
   * `undefined` = non applicable (résultat TMDB pas encore importé). */
  studioIds?: string[];
};

export type PersonSearchResult = {
  id: string;
  tmdbId?: number;
  nom: string;
  photoUrl?: string;
  rolePrincipal?: string;
  local: boolean;
};

// ============================================
// Phase 3 - Pages de détail (titres, personnes, saisons, épisodes)
// Types alignés sur les réponses NestJS (Prisma raw, snake_case)
// ============================================

/** Titre détaillé (GET /titles/:id) — inclut genres, pays, studios, saisons+épisodes */
export type TitleDetail = {
  id: string;
  tmdb_id?: number | null;
  titre_vo: string;
  titre_vf?: string | null;
  type: "film" | "serie";
  date_sortie?: string | null;
  duree_minutes?: number | null;
  note_imdb?: number | null;
  synopsis?: string | null;
  affiche_url?: string | null;
  backdrop_url?: string | null;
  statut?: string | null;
  is_animation?: boolean;
  next_episode_air_date?: string | null;
  title_genres: Array<{
    id: string;
    genre_id: string;
    genres: Genre;
  }>;
  title_countries: Array<{
    id: string;
    country_id: string;
    countries: Country;
  }>;
  title_studios: Array<{
    id: string;
    studio_id: string;
    studios: { id: string; nom: string; logo_url?: string | null };
  }>;
  seasons: SeasonWithEpisodes[];
};

/** Épisode tel que renvoyé dans une saison (pas le type `Episode`
 * camelCase, qui ne correspond pas à la forme réelle de cette réponse —
 * bug repéré lors de la modification M). */
export type SeasonEpisodeSummary = {
  id: string;
  numero: number;
  titre?: string | null;
  synopsis?: string | null;
  date_sortie?: string | null;
  duree_minutes?: number | null;
  image_url?: string | null;
};

/** Saison avec ses épisodes (GET /titles/:titleId/seasons/:numero) */
export type SeasonWithEpisodes = {
  id: string;
  numero: number;
  titre?: string | null;
  date_sortie?: string | null;
  synopsis?: string | null;
  episodes: SeasonEpisodeSummary[];
};

/** Épisode détaillé (GET /episodes/:id) — inclut la saison parente */
export type EpisodeDetail = {
  id: string;
  numero: number;
  titre: string;
  synopsis?: string | null;
  date_sortie?: string | null;
  duree_minutes?: number | null;
  image_url?: string | null;
  season_id?: string | null;
  seasons?: {
    id: string;
    numero: number;
    titre?: string | null;
    title_id?: string | null;
  };
};

/** Élément de crédit (crédit titre ou épisode) */
export type CreditItem = {
  id: string;
  personnage?: string | null;
  ordre?: number | null;
  personne: {
    id: string;
    tmdb_id?: number | null;
    nom: string;
    photo_url?: string | null;
  };
};

/** Crédits groupés par rôle (GET /titles/:titleId/credits, GET /episodes/:id/credits) */
export type CreditGrouped = Record<string, CreditItem[]>;

/** Élément de filmographie (GET /people/:id/filmography) */
export type FilmographyItem = {
  id: string;
  personnage?: string | null;
  ordre?: number | null;
  titre: {
    id: string;
    tmdb_id?: number | null;
    titre_vo: string;
    titre_vf?: string | null;
    affiche_url?: string | null;
    type: "film" | "serie";
    date_sortie?: string | null;
    note_imdb?: number | null;
    title_genres?: Array<{ genre_id: string; genres: Genre }>;
    title_countries?: Array<{ country_id: string; countries: Country }>;
  };
  episode_id?: string | null;
};

/** Filmographie groupée par rôle (GET /people/:id/filmography) */
export type FilmographyGrouped = Record<string, FilmographyItem[]>;

/** Personne recommandée (GET /people/:id/recommendations) */
export type PersonRecommendation = {
  id: string;
  tmdb_id?: number | null;
  nom: string;
  photo_url?: string | null;
  genre?: string | null;
  bio?: string | null;
};

/** Personne suivie (GET /people/followed) */
export type FollowedPerson = {
  id: string;
  tmdb_id?: number | null;
  nom: string;
  photo_url?: string | null;
  followed_at: string;
};

/** Titre recommandé (GET /titles/:id/recommendations) */
export type TitleRecommendation = {
  id: string;
  tmdb_id?: number | null;
  titre_vo: string;
  titre_vf?: string | null;
  affiche_url?: string | null;
  type: "film" | "serie";
  note_imdb?: number | null;
};

/** Saison dans la liste (GET /titles/:titleId/seasons) */
export type SeasonSummary = {
  id: string;
  numero: number;
  titre?: string | null;
  date_sortie?: string | null;
  synopsis?: string | null;
  nombre_episodes: number;
};

/** Personne détaillée (GET /people/:id) — inclut le pays */
export type PersonDetail = Person & {
  tmdb_id?: number | null;
  genre?: string | null;
  date_naissance?: string | null;
  pays_id?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  wiki_url?: string | null;
  source?: string | null;
  created_at?: string | null;
  countries?: { id: string; code: string; nom: string } | null;
};

/** Mapping utilitaire : convertit un TitleRecommendation en TitleSearchResult pour TitleCard */
export function titleRecommendationToSearchResult(
  rec: TitleRecommendation,
): TitleSearchResult {
  // Si rec.id est absent (titre non-local, fallback TMDB), on met local=false
  // pour que TitleCard génère le href /titles/tmdb/:tmdbId?type=...
  const isLocal = !!rec.id;
  return {
    id: rec.id ?? "",
    tmdbId: rec.tmdb_id ?? undefined,
    titre: rec.titre_vo,
    titreOriginal:
      rec.titre_vf && rec.titre_vf !== rec.titre_vo ? rec.titre_vf : undefined,
    type: rec.type,
    dateSortie: undefined,
    note: rec.note_imdb ?? undefined,
    afficheUrl: rec.affiche_url ?? undefined,
    genres: undefined,
    pays: undefined,
    local: isLocal,
  };
}

/** Mapping utilitaire : convertit un FilmographyItem en TitleSearchResult pour TitleCard */
export function filmographyToSearchResult(
  item: FilmographyItem,
): TitleSearchResult {
  return {
    id: item.titre.id,
    tmdbId: item.titre.tmdb_id ?? undefined,
    titre: item.titre.titre_vo,
    titreOriginal:
      item.titre.titre_vf && item.titre.titre_vf !== item.titre.titre_vo
        ? item.titre.titre_vf
        : undefined,
    type: item.titre.type,
    dateSortie: item.titre.date_sortie ?? undefined,
    note: item.titre.note_imdb ?? undefined,
    afficheUrl: item.titre.affiche_url ?? undefined,
    genres: undefined,
    pays: undefined,
    local: true,
  };
}
