"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapTmdbEpisodeCredits = mapTmdbEpisodeCredits;
exports.mapTmdbPersonExternalIds = mapTmdbPersonExternalIds;
exports.mapTmdbGenres = mapTmdbGenres;
exports.mapTmdbCountries = mapTmdbCountries;
exports.mapTmdbCredits = mapTmdbCredits;
exports.mapTmdbPerson = mapTmdbPerson;
exports.mapTmdbSeason = mapTmdbSeason;
exports.mapTmdbEpisode = mapTmdbEpisode;
exports.mapTmdbMovieToTitle = mapTmdbMovieToTitle;
exports.mapTmdbTvToTitle = mapTmdbTvToTitle;
function mapTmdbEpisodeCredits(tmdbEpisodeCredits, episodeId) {
    const mapped = [];
    for (const guestStar of tmdbEpisodeCredits.guest_stars || []) {
        mapped.push({
            tmdb_person_id: guestStar.id,
            role: 'acteur',
            personnage: guestStar.character,
            ordre: guestStar.order,
            episode_id: episodeId,
            source: 'tmdb',
        });
    }
    for (const crewMember of tmdbEpisodeCredits.crew || []) {
        const role = crewMember.job === 'Director'
            ? 'realisateur'
            : crewMember.job === 'Writer' || crewMember.job === 'Screenplay'
                ? 'scenariste'
                : 'autre';
        mapped.push({
            tmdb_person_id: crewMember.id,
            role,
            episode_id: episodeId,
            source: 'tmdb',
        });
    }
    return mapped;
}
function mapTmdbPersonExternalIds(tmdbExternalIds) {
    return {
        imdb_id: tmdbExternalIds.imdb_id ?? null,
        wikidata_id: tmdbExternalIds.wikidata_id ?? null,
    };
}
function mapTmdbGenres(tmdbGenres) {
    return tmdbGenres.map((genre) => ({
        tmdb_id: genre.id,
        nom: genre.name,
    }));
}
function mapTmdbCountries(tmdbCountries) {
    return tmdbCountries.map((country) => ({
        code: country.iso_3166_1,
        nom: country.name,
    }));
}
function mapTmdbCredits(tmdbCredits, titleId, episodeId) {
    const credits = [];
    for (const castMember of tmdbCredits?.cast || []) {
        credits.push({
            tmdb_person_id: castMember.id,
            role: 'acteur',
            personnage: castMember.character ?? null,
            ordre: castMember.order ?? null,
            title_id: titleId,
            episode_id: episodeId ?? null,
            source: 'tmdb',
        });
    }
    for (const crewMember of tmdbCredits?.crew || []) {
        const role = crewMember.job === 'Director'
            ? 'realisateur'
            : crewMember.job === 'Writer' || crewMember.job === 'Screenplay'
                ? 'scenariste'
                : 'autre';
        credits.push({
            tmdb_person_id: crewMember.id,
            role,
            personnage: null,
            ordre: null,
            title_id: titleId,
            episode_id: episodeId ?? null,
            source: 'tmdb',
        });
    }
    return credits;
}
function mapTmdbPerson(tmdbPerson, wikiUrl) {
    const genderMap = {
        1: 'femme',
        2: 'homme',
    };
    return {
        tmdb_id: tmdbPerson.id,
        nom: tmdbPerson.name,
        genre: genderMap[tmdbPerson.gender ?? 0] ?? 'autre',
        date_naissance: tmdbPerson.birthday ? new Date(tmdbPerson.birthday) : null,
        pays_id: null,
        photo_url: tmdbPerson.profile_path
            ? `https://image.tmdb.org/t/p/w500${tmdbPerson.profile_path}`
            : null,
        bio: tmdbPerson.biography ?? null,
        wiki_url: wikiUrl,
        source: 'tmdb',
    };
}
function mapTmdbSeason(tmdbSeason, titleId) {
    return {
        title_id: titleId,
        numero: tmdbSeason.season_number,
        titre: tmdbSeason.name ?? null,
        date_sortie: tmdbSeason.air_date ? new Date(tmdbSeason.air_date) : null,
        synopsis: tmdbSeason.overview ?? null,
    };
}
function mapTmdbEpisode(tmdbEpisode, seasonId) {
    return {
        season_id: seasonId,
        numero: tmdbEpisode.episode_number,
        titre: tmdbEpisode.name ?? null,
        synopsis: tmdbEpisode.overview ?? null,
        date_sortie: tmdbEpisode.air_date ? new Date(tmdbEpisode.air_date) : null,
        duree_minutes: tmdbEpisode.runtime ?? null,
        image_url: tmdbEpisode.still_path
            ? `https://image.tmdb.org/t/p/w500${tmdbEpisode.still_path}`
            : null,
    };
}
function mapTmdbMovieToTitle(tmdbMovie) {
    return {
        tmdb_id: tmdbMovie.id,
        type: 'film',
        titre_vo: tmdbMovie.original_title,
        titre_vf: tmdbMovie.title,
        synopsis: tmdbMovie.overview ?? null,
        date_sortie: tmdbMovie.release_date ? new Date(tmdbMovie.release_date) : null,
        duree_minutes: tmdbMovie.runtime ?? null,
        note_imdb: tmdbMovie.vote_average ?? null,
        affiche_url: tmdbMovie.poster_path
            ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
            : null,
        statut_serie: null,
        next_episode_air_date: null,
        source: 'tmdb',
    };
}
function mapTmdbTvToTitle(tmdbTv) {
    const statusMap = {
        Returning: 'en_cours',
        'Returning Series': 'en_cours',
        Ended: 'terminee',
        Canceled: 'annulee',
        Cancelled: 'annulee',
    };
    return {
        tmdb_id: tmdbTv.id,
        type: 'serie',
        titre_vo: tmdbTv.original_name,
        titre_vf: tmdbTv.name,
        synopsis: tmdbTv.overview ?? null,
        date_sortie: tmdbTv.first_air_date ? new Date(tmdbTv.first_air_date) : null,
        duree_minutes: tmdbTv.episode_run_time?.[0] ?? null,
        note_imdb: tmdbTv.vote_average ?? null,
        affiche_url: tmdbTv.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbTv.poster_path}` : null,
        statut_serie: tmdbTv.status ? (statusMap[tmdbTv.status] ?? tmdbTv.status.toLowerCase()) : null,
        next_episode_air_date: tmdbTv.next_episode_to_air?.air_date
            ? new Date(tmdbTv.next_episode_to_air.air_date)
            : null,
        source: 'tmdb',
    };
}
//# sourceMappingURL=index.js.map