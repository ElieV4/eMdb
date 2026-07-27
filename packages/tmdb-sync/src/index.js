"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importPersonByTmdbId = importPersonByTmdbId;
exports.importEpisodeGuestCredits = importEpisodeGuestCredits;
exports.importTitleByTmdbId = importTitleByTmdbId;
exports.importSeasonsForSerie = importSeasonsForSerie;
exports.refreshPersonData = refreshPersonData;
exports.refreshTitleData = refreshTitleData;
exports.generateNewEpisodeNotifications = generateNewEpisodeNotifications;
exports.generateSeasonPremiereNotification = generateSeasonPremiereNotification;
exports.dailySyncNewEpisodes = dailySyncNewEpisodes;
exports.weeklyResyncChanges = weeklyResyncChanges;
exports.bootstrapPersonRecommendationsFromTmdb = bootstrapPersonRecommendationsFromTmdb;
exports.bootstrapRecommendationsFromTmdb = bootstrapRecommendationsFromTmdb;
const db_1 = require("@emdb/db");
const tmdb_client_1 = require("@emdb/tmdb-client");
const tmdb_mapper_1 = require("@emdb/tmdb-mapper");
const wikidata_client_1 = require("@emdb/wikidata-client");
const ROLE_LIBELLES = {
    acteur: 'Acteur',
    realisateur: 'Réalisateur',
    scenariste: 'Scénariste',
    autre: 'Autre',
};
async function ensureRoleId(role) {
    const code = role;
    const libelle = ROLE_LIBELLES[role] ?? 'Autre';
    const roleRecord = await db_1.prisma.roles.upsert({
        where: { code },
        update: { libelle },
        create: { code, libelle },
    });
    return roleRecord.id;
}
async function createSyncLog(params) {
    await db_1.prisma.tmdb_sync_log.create({
        data: {
            tmdb_id: params.tmdb_id,
            type: params.type,
            action: params.action,
            status: params.status,
            error: params.error ?? null,
        },
    });
}
async function importPersonByTmdbId(tmdbId) {
    const tmdbPerson = await (0, tmdb_client_1.getPersonDetails)(tmdbId);
    const externalIds = await (0, tmdb_client_1.getPersonExternalIds)(tmdbId);
    const { wikidata_id } = (0, tmdb_mapper_1.mapTmdbPersonExternalIds)(externalIds);
    const wikiUrl = wikidata_id ? await (0, wikidata_client_1.getWikipediaUrlFromWikidataId)(wikidata_id) : null;
    const mappedPerson = (0, tmdb_mapper_1.mapTmdbPerson)(tmdbPerson, wikiUrl);
    const person = await db_1.prisma.people.upsert({
        where: { tmdb_id: tmdbId },
        update: mappedPerson,
        create: mappedPerson,
    });
    return person;
}
async function importEpisodeGuestCredits(episodeId, tmdbId, seasonNumber, episodeNumber) {
    const episodeDetails = await (0, tmdb_client_1.getTvEpisodeDetails)(tmdbId, seasonNumber, episodeNumber);
    const credits = (0, tmdb_mapper_1.mapTmdbEpisodeCredits)(episodeDetails, episodeId);
    const title = await db_1.prisma.titles.findUnique({
        where: { tmdb_id: episodeDetails.show.id },
    });
    if (!title) {
        throw new Error('Titre local introuvable pour le show TMDB');
    }
    for (const credit of credits) {
        const person = await importPersonByTmdbId(credit.tmdb_person_id);
        const roleId = await ensureRoleId(credit.role);
        try {
            await db_1.prisma.credits.create({
                data: {
                    title_id: title.id,
                    person_id: person.id,
                    episode_id: episodeId,
                    role_id: roleId,
                    personnage: credit.personnage ?? null,
                    ordre: credit.ordre ?? 0,
                    source: 'tmdb',
                },
            });
        }
        catch (error) {
            if (/duplicate key/i.test(error.message) || /unique constraint/.test(error.message)) {
                continue;
            }
            throw error;
        }
    }
}
async function ensureGenreIds(genres) {
    const ids = [];
    for (const genre of (0, tmdb_mapper_1.mapTmdbGenres)(genres)) {
        if (!genre.nom) {
            continue;
        }
        const record = await db_1.prisma.genres.upsert({
            where: { nom: genre.nom },
            create: {
                nom: genre.nom,
                tmdb_id: genre.tmdb_id,
            },
            update: {
                tmdb_id: genre.tmdb_id,
            },
        });
        ids.push(record.id);
    }
    return ids;
}
async function ensureCountryIds(countries) {
    const ids = [];
    for (const country of (0, tmdb_mapper_1.mapTmdbCountries)(countries)) {
        const record = await db_1.prisma.countries.upsert({
            where: { code: country.code },
            create: {
                code: country.code,
                nom: country.nom,
            },
            update: {
                nom: country.nom,
            },
        });
        ids.push(record.id);
    }
    return ids;
}
async function importTitleByTmdbId(tmdbId, type) {
    console.log('[importTitleByTmdbId] start', tmdbId, type);
    await createSyncLog({
        tmdb_id: tmdbId,
        type,
        action: 'importTitle',
        status: 'started',
    });
    try {
        console.log('[importTitleByTmdbId] fetch tmdb', tmdbId, type);
        const tmdbData = type === 'film' ? await (0, tmdb_client_1.getMovieDetails)(tmdbId) : await (0, tmdb_client_1.getTvDetails)(tmdbId);
        console.log('[importTitleByTmdbId] tmdb fetched', tmdbId, type, !!tmdbData);
        const titlePayload = type === 'film' ? (0, tmdb_mapper_1.mapTmdbMovieToTitle)(tmdbData) : (0, tmdb_mapper_1.mapTmdbTvToTitle)(tmdbData);
        console.log('[importTitleByTmdbId] upsert', tmdbId, type);
        const title = await db_1.prisma.titles.upsert({
            where: { tmdb_id: tmdbId },
            create: titlePayload,
            update: titlePayload,
        });
        console.log('[importTitleByTmdbId] upsert done', tmdbId, type, title.id);
        if (tmdbData.genres?.length) {
            console.log('[importTitleByTmdbId] genres', tmdbId, tmdbData.genres.length);
            const genreIds = await ensureGenreIds(tmdbData.genres);
            await db_1.prisma.title_genres.createMany({
                data: genreIds.map((genreId) => ({ title_id: title.id, genre_id: genreId })),
                skipDuplicates: true,
            });
        }
        if (tmdbData.production_countries?.length) {
            console.log('[importTitleByTmdbId] countries', tmdbId, tmdbData.production_countries.length);
            const countryIds = await ensureCountryIds(tmdbData.production_countries);
            await db_1.prisma.title_countries.createMany({
                data: countryIds.map((countryId) => ({ title_id: title.id, country_id: countryId })),
                skipDuplicates: true,
            });
        }
        if (tmdbData.credits) {
            console.log('[importTitleByTmdbId] credits', tmdbId, tmdbData.credits?.cast?.length, tmdbData.credits?.crew?.length);
            const creditInserts = (0, tmdb_mapper_1.mapTmdbCredits)(tmdbData.credits, title.id, null);
            for (const credit of creditInserts) {
                const person = await importPersonByTmdbId(credit.tmdb_person_id);
                const roleId = await ensureRoleId(credit.role);
                try {
                    await db_1.prisma.credits.create({
                        data: {
                            title_id: title.id,
                            person_id: person.id,
                            episode_id: null,
                            role_id: roleId,
                            personnage: credit.personnage,
                            ordre: credit.ordre,
                            source: 'tmdb',
                        },
                    });
                }
                catch (error) {
                    if (/duplicate key/i.test(error.message) || /unique constraint/.test(error.message)) {
                        continue;
                    }
                    throw error;
                }
            }
        }
        if (type === 'serie') {
            console.log('[importTitleByTmdbId] seasons start', title.id);
            await importSeasonsForSerie(title.id);
            console.log('[importTitleByTmdbId] seasons done', title.id);
        }
        await createSyncLog({
            tmdb_id: tmdbId,
            type,
            action: 'importTitle',
            status: 'success',
        });
        console.log('[importTitleByTmdbId] success', tmdbId, type, title.id);
        return title;
    }
    catch (error) {
        const message = error?.message ?? 'unknown error';
        console.error('[importTitleByTmdbId] failed', tmdbId, type, message, error?.stack);
        await createSyncLog({
            tmdb_id: tmdbId,
            type,
            action: 'importTitle',
            status: 'failed',
            error: message,
        });
        throw error;
    }
}
async function importSeasonsForSerie(titleId) {
    const title = await db_1.prisma.titles.findUnique({ where: { id: titleId } });
    if (!title?.tmdb_id || title.type !== 'serie') {
        throw new Error('Titre introuvable, non-série ou sans tmdb_id');
    }
    const tvDetails = await (0, tmdb_client_1.getTvDetails)(title.tmdb_id);
    const seasons = tvDetails.seasons || [];
    for (const seasonSummary of seasons) {
        const seasonDetails = await (0, tmdb_client_1.getTvSeason)(title.tmdb_id, seasonSummary.season_number);
        const seasonPayload = (0, tmdb_mapper_1.mapTmdbSeason)(seasonDetails, titleId);
        const season = await db_1.prisma.seasons.upsert({
            where: {
                title_id_numero: {
                    title_id: titleId,
                    numero: seasonDetails.season_number,
                },
            },
            create: seasonPayload,
            update: seasonPayload,
        });
        for (const episode of seasonDetails.episodes || []) {
            const episodePayload = (0, tmdb_mapper_1.mapTmdbEpisode)(episode, season.id);
            await db_1.prisma.episodes.upsert({
                where: {
                    season_id_numero: {
                        season_id: season.id,
                        numero: episode.episode_number,
                    },
                },
                create: episodePayload,
                update: episodePayload,
            });
        }
    }
}
async function refreshPersonData(personId) {
    const person = await db_1.prisma.people.findUnique({ where: { id: personId } });
    if (!person?.tmdb_id) {
        throw new Error('Personne introuvable ou sans tmdb_id');
    }
    const tmdbPerson = await (0, tmdb_client_1.getPersonDetails)(person.tmdb_id);
    const externalIds = await (0, tmdb_client_1.getPersonExternalIds)(person.tmdb_id);
    const { wikidata_id } = (0, tmdb_mapper_1.mapTmdbPersonExternalIds)(externalIds);
    const wikiUrl = wikidata_id ? await (0, wikidata_client_1.getWikipediaUrlFromWikidataId)(wikidata_id) : null;
    return db_1.prisma.people.update({
        where: { id: personId },
        data: {
            nom: tmdbPerson.name,
            genre: tmdbPerson.gender === 1 ? 'femme' : tmdbPerson.gender === 2 ? 'homme' : 'autre',
            date_naissance: tmdbPerson.birthday ? new Date(tmdbPerson.birthday) : null,
            photo_url: tmdbPerson.profile_path
                ? `https://image.tmdb.org/t/p/w500${tmdbPerson.profile_path}`
                : null,
            bio: tmdbPerson.biography,
            wiki_url: wikiUrl,
        },
    });
}
async function refreshTitleData(titleId) {
    const title = await db_1.prisma.titles.findUnique({ where: { id: titleId } });
    if (!title?.tmdb_id) {
        throw new Error('Titre introuvable ou sans tmdb_id');
    }
    const tmdbData = title.type === 'film'
        ? await (0, tmdb_client_1.getMovieDetails)(title.tmdb_id)
        : await (0, tmdb_client_1.getTvDetails)(title.tmdb_id);
    const updatePayload = title.type === 'film' ? (0, tmdb_mapper_1.mapTmdbMovieToTitle)(tmdbData) : (0, tmdb_mapper_1.mapTmdbTvToTitle)(tmdbData);
    return db_1.prisma.titles.update({
        where: { id: titleId },
        data: updatePayload,
    });
}
/**
 * Génère des notifications pour les nouveaux épisodes des séries suivies.
 *
 * Algorithme :
 * 1. Récupérer toutes les séries en cours avec next_episode_air_date <= aujourd'hui
 * 2. Pour chaque série, trouver les utilisateurs qui la suivent
 * 3. Trouver le dernier épisode sorti non encore notifié
 * 4. Créer une notification par follower (déduplication par episode_id + type)
 *
 * @returns Nombre total de notifications créées
 * @phase 7.2
 */
async function generateNewEpisodeNotifications() {
    const series = await db_1.prisma.titles.findMany({
        where: {
            type: 'serie',
            statut_serie: { in: ['en_cours', 'retourne'] },
            next_episode_air_date: { lte: new Date() },
        },
        select: { id: true, titre_vo: true },
    });
    if (series.length === 0)
        return 0;
    let totalNotifications = 0;
    for (const serie of series) {
        const followers = await db_1.prisma.user_follows_serie.findMany({
            where: { title_id: serie.id },
            select: { user_id: true },
        });
        if (followers.length === 0)
            continue;
        const latestEpisode = await db_1.prisma.episodes.findFirst({
            where: {
                seasons: { title_id: serie.id },
                date_sortie: { lte: new Date() },
            },
            orderBy: { date_sortie: 'desc' },
            select: { id: true, numero: true, titre: true },
        });
        if (!latestEpisode)
            continue;
        const existingNotif = await db_1.prisma.notifications.findFirst({
            where: {
                episode_id: latestEpisode.id,
                type: 'new_episode',
            },
        });
        if (existingNotif)
            continue;
        const notifications = followers.map((f) => ({
            user_id: f.user_id,
            episode_id: latestEpisode.id,
            type: 'new_episode',
            lu: false,
        }));
        await db_1.prisma.notifications.createMany({ data: notifications });
        totalNotifications += notifications.length;
    }
    return totalNotifications;
}
/**
 * Génère une notification pour la première d'une nouvelle saison.
 *
 * Déclenché quand une nouvelle saison est importée pour une série suivie.
 *
 * @param titleId - UUID de la série
 * @param seasonNumber - Numéro de la nouvelle saison
 * @returns Nombre de notifications créées
 * @phase 7.2
 */
async function generateSeasonPremiereNotification(titleId, seasonNumber) {
    const followers = await db_1.prisma.user_follows_serie.findMany({
        where: { title_id: titleId },
        select: { user_id: true },
    });
    if (followers.length === 0)
        return 0;
    const firstEpisode = await db_1.prisma.episodes.findFirst({
        where: {
            seasons: { title_id: titleId, numero: seasonNumber },
        },
        orderBy: { numero: 'asc' },
        select: { id: true },
    });
    if (!firstEpisode)
        return 0;
    const existingNotif = await db_1.prisma.notifications.findFirst({
        where: {
            episode_id: firstEpisode.id,
            type: 'season_premiere',
        },
    });
    if (existingNotif)
        return 0;
    const notifications = followers.map((f) => ({
        user_id: f.user_id,
        episode_id: firstEpisode.id,
        type: 'season_premiere',
        lu: false,
    }));
    await db_1.prisma.notifications.createMany({ data: notifications });
    return notifications.length;
}
async function dailySyncNewEpisodes() {
    const titles = await db_1.prisma.titles.findMany({
        where: {
            type: 'serie',
            statut_serie: 'en_cours',
            OR: [
                { user_follows_serie: { some: {} } },
                { user_ratings: { some: {} } },
                { user_watches: { some: {} } },
            ],
        },
        select: {
            id: true,
            tmdb_id: true,
        },
    });
    let titlesRefreshed = 0;
    for (const title of titles) {
        if (!title.tmdb_id) {
            continue;
        }
        await refreshTitleData(title.id);
        await importSeasonsForSerie(title.id);
        titlesRefreshed++;
    }
    // Générer les notifications pour les nouveaux épisodes (Phase 7.2)
    const notificationsCreated = await generateNewEpisodeNotifications();
    return { titlesRefreshed, notificationsCreated };
}
async function weeklyResyncChanges(startDate, endDate) {
    const changes = await (0, tmdb_client_1.getChanges)(startDate, endDate);
    const updatedTitles = [];
    for (const movieChange of changes.movie?.results || []) {
        const title = await db_1.prisma.titles.findUnique({
            where: { tmdb_id: movieChange.id },
        });
        if (!title || title.type !== 'film') {
            continue;
        }
        await importTitleByTmdbId(movieChange.id, 'film');
        updatedTitles.push({ tmdbId: movieChange.id, type: 'film' });
    }
    for (const tvChange of changes.tv?.results || []) {
        const title = await db_1.prisma.titles.findUnique({
            where: { tmdb_id: tvChange.id },
        });
        if (!title || title.type !== 'serie') {
            continue;
        }
        await importTitleByTmdbId(tvChange.id, 'serie');
        updatedTitles.push({ tmdbId: tvChange.id, type: 'serie' });
    }
    return updatedTitles;
}
const TMDB_RECOMMENDATION_LIMIT = 10;
/**
 * Bootstrap les recommandations TMDB pour une personne.
 *
 * Stratégie :
 * 1. Fetch getPersonCombinedCredits(personTmdbId) → tous les titres TMDB de cette personne
 * 2. Filtrer les titres déjà présents en local (prisma.titles.findMany)
 * 3. Pour chaque titre local, trouver les autres personnes (credits) qui y ont participé
 * 4. Calculer le score de similarité : Jaccard = intersection / union des credits
 * 5. Top 10 → person_recommendations
 *
 * @param personId - UUID de la personne en base
 * @returns Nombre de recommandations insérées
 * @throws Error si la personne n'existe pas ou n'a pas de tmdb_id
 */
async function bootstrapPersonRecommendationsFromTmdb(personId) {
    const person = await db_1.prisma.people.findUnique({
        where: { id: personId },
        select: { id: true, tmdb_id: true },
    });
    if (!person) {
        throw new Error('Personne introuvable.');
    }
    if (!person.tmdb_id) {
        throw new Error("La personne n'a pas de tmdb_id, impossible de bootstrap depuis TMDB.");
    }
    // 1. Fetch TMDB combined credits
    const tmdbCredits = await (0, tmdb_client_1.getPersonCombinedCredits)(person.tmdb_id);
    // 2. Extraire les TMDB IDs des titres où la personne a participé
    const tmdbTitleIds = new Set();
    for (const credit of [...(tmdbCredits.cast ?? []), ...(tmdbCredits.crew ?? [])]) {
        if (credit.id) {
            tmdbTitleIds.add(credit.id);
        }
    }
    if (tmdbTitleIds.size === 0) {
        return 0; // Aucun credit TMDB → pas de recommandations possibles
    }
    // 3. Trouver les titres locaux correspondant à ces TMDB IDs
    const localTitles = await db_1.prisma.titles.findMany({
        where: { tmdb_id: { in: Array.from(tmdbTitleIds) } },
        select: { id: true },
    });
    const localTitleIds = localTitles.map((t) => t.id);
    if (localTitleIds.length === 0) {
        return 0; // Aucun titre local → pas de base pour calculer la similarité
    }
    // 4. Trouver les autres personnes ayant participé aux mêmes titres locaux
    const otherCredits = await db_1.prisma.credits.findMany({
        where: {
            title_id: { in: localTitleIds },
            person_id: { not: personId },
            episode_id: null, // Seulement les credits au niveau titre
        },
        select: {
            person_id: true,
            title_id: true,
        },
    });
    // 5. Indexer : Map<person_id, Set<title_id>>
    const personTitles = new Map();
    for (const credit of otherCredits) {
        if (!personTitles.has(credit.person_id)) {
            personTitles.set(credit.person_id, new Set());
        }
        personTitles.get(credit.person_id).add(credit.title_id);
    }
    // 6. Calculer le score Jaccard pour chaque personne candidate
    const personTitleSet = new Set(localTitleIds);
    const candidates = [];
    for (const [otherPersonId, otherTitles] of personTitles) {
        // @ts-ignore - Type issue with Set elements
        const intersection = new Set([...personTitleSet].filter((x) => otherTitles.has(x)));
        const union = new Set([...personTitleSet, ...otherTitles]);
        const jaccard = intersection.size / union.size;
        if (jaccard > 0) {
            candidates.push({ personId: otherPersonId, score: jaccard });
        }
    }
    // 7. Top 10
    candidates.sort((a, b) => b.score - a.score);
    const top10 = candidates.slice(0, TMDB_RECOMMENDATION_LIMIT);
    // 8. Insérer dans person_recommendations
    const records = top10.map((c) => ({
        person_id: personId,
        recommended_id: c.personId,
        score: parseFloat(c.score.toFixed(4)),
    }));
    if (records.length > 0) {
        await db_1.prisma.$transaction(async (tx) => {
            // Supprimer les anciennes recommandations TMDB pour cette personne
            await tx.person_recommendations.deleteMany({
                where: { person_id: personId },
            });
            // Insérer les nouvelles
            await tx.person_recommendations.createMany({
                data: records,
            });
        });
    }
    return records.length;
}
async function bootstrapRecommendationsFromTmdb(titleId) {
    const title = await db_1.prisma.titles.findUnique({ where: { id: titleId } });
    if (!title?.tmdb_id) {
        throw new Error('Titre introuvable ou sans tmdb_id');
    }
    const tmdbId = title.tmdb_id;
    const recommendationFetcher = title.type === 'film'
        ? () => Promise.all([(0, tmdb_client_1.getMovieRecommendations)(tmdbId), (0, tmdb_client_1.getMovieSimilar)(tmdbId)])
        : () => Promise.all([(0, tmdb_client_1.getTvRecommendations)(tmdbId), (0, tmdb_client_1.getTvSimilar)(tmdbId)]);
    const [recommendations, similar] = await recommendationFetcher();
    const records = [];
    for (const rec of [...recommendations.results, ...similar.results]) {
        if (!rec.id)
            continue;
        const existingTitle = await db_1.prisma.titles.findUnique({ where: { tmdb_id: rec.id } });
        if (!existingTitle)
            continue;
        records.push({
            title_id: titleId,
            recommended_id: existingTitle.id,
            score: rec.vote_average ? Number(rec.vote_average) / 10 : 0,
        });
    }
    if (records.length > 0) {
        await db_1.prisma.title_recommendations.createMany({ data: records, skipDuplicates: true });
    }
    return records;
}
//# sourceMappingURL=index.js.map