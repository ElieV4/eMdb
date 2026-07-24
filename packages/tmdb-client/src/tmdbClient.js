"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMovie = searchMovie;
exports.searchTv = searchTv;
exports.searchPerson = searchPerson;
exports.searchMulti = searchMulti;
exports.getConfiguration = getConfiguration;
exports.getMovieDetails = getMovieDetails;
exports.getTvDetails = getTvDetails;
exports.getTvSeason = getTvSeason;
exports.getPersonDetails = getPersonDetails;
exports.getPersonCombinedCredits = getPersonCombinedCredits;
exports.getGenreListMovie = getGenreListMovie;
exports.getGenreListTv = getGenreListTv;
exports.getMovieExternalIds = getMovieExternalIds;
exports.getTvExternalIds = getTvExternalIds;
exports.getPersonExternalIds = getPersonExternalIds;
exports.getTvEpisodeDetails = getTvEpisodeDetails;
exports.getMovieImages = getMovieImages;
exports.getTvImages = getTvImages;
exports.getPersonImages = getPersonImages;
exports.getMovieVideos = getMovieVideos;
exports.getTvVideos = getTvVideos;
exports.getMovieRecommendations = getMovieRecommendations;
exports.getMovieSimilar = getMovieSimilar;
exports.getTvRecommendations = getTvRecommendations;
exports.getTvSimilar = getTvSimilar;
exports.getCollectionDetails = getCollectionDetails;
exports.getTrending = getTrending;
exports.getDiscoverMovie = getDiscoverMovie;
exports.getDiscoverTv = getDiscoverTv;
exports.getChanges = getChanges;
const ioredis_1 = __importDefault(require("ioredis"));
const TMDB_BASE_URL = process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3';
const TMDB_CACHE_REDIS_URL = process.env.TMDB_CACHE_REDIS_URL ?? process.env.REDIS_URL;
const TMDB_CACHE_TTL_SECONDS = Number(process.env.TMDB_CACHE_TTL_SECONDS ?? '86400');
const TMDB_MAX_REQUESTS = Number(process.env.TMDB_MAX_REQUESTS ?? '40');
const TMDB_REQUEST_INTERVAL_MS = Number(process.env.TMDB_REQUEST_INTERVAL_MS ?? '10000');
const TMDB_MAX_RETRIES = Number(process.env.TMDB_MAX_RETRIES ?? '3');
const TMDB_RETRY_BASE_DELAY_MS = Number(process.env.TMDB_RETRY_BASE_DELAY_MS ?? '50');
function getTmdbAuthMethod() {
    return (process.env.TMDB_AUTH_METHOD ?? 'query').toLowerCase();
}
function getTmdbApiKey() {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
        throw new Error('TMDB_API_KEY is required in environment variables');
    }
    return key;
}
function authHeaders() {
    if (getTmdbAuthMethod() === 'bearer') {
        return {
            Authorization: `Bearer ${getTmdbApiKey()}`,
        };
    }
    return {};
}
function buildUrl(path, params = {}) {
    const url = new URL(`${TMDB_BASE_URL}${path}`);
    if (getTmdbAuthMethod() !== 'bearer') {
        url.searchParams.set('api_key', getTmdbApiKey());
    }
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
}
let redisClient = null;
function getRedisClient() {
    if (!TMDB_CACHE_REDIS_URL) {
        return null;
    }
    if (!redisClient) {
        redisClient = new ioredis_1.default(TMDB_CACHE_REDIS_URL, {
            keyPrefix: 'tmdb-client:',
        });
        redisClient.on('error', () => {
            // Silencieux en cas d'indisponibilité de Redis, on retombe sur l'API TMDB.
        });
    }
    return redisClient;
}
async function getCache(key) {
    const client = getRedisClient();
    if (!client) {
        return undefined;
    }
    const cached = await client.get(key);
    if (!cached) {
        return undefined;
    }
    try {
        return JSON.parse(cached);
    }
    catch {
        return undefined;
    }
}
async function setCache(key, value) {
    const client = getRedisClient();
    if (!client) {
        return;
    }
    await client.set(key, JSON.stringify(value), 'EX', TMDB_CACHE_TTL_SECONDS);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function parseRetryAfter(retryAfter) {
    if (!retryAfter) {
        return null;
    }
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) {
        return seconds * 1000;
    }
    const parsedDate = Date.parse(retryAfter);
    if (!Number.isNaN(parsedDate)) {
        return Math.max(parsedDate - Date.now(), 0);
    }
    return null;
}
class RateLimiter {
    maxRequests;
    intervalMs;
    tokens;
    lastRefill;
    queue = [];
    constructor(maxRequests, intervalMs) {
        this.maxRequests = maxRequests;
        this.intervalMs = intervalMs;
        this.tokens = maxRequests;
        this.lastRefill = Date.now();
    }
    refill() {
        const now = Date.now();
        if (now - this.lastRefill >= this.intervalMs) {
            this.tokens = this.maxRequests;
            this.lastRefill = now;
            while (this.tokens > 0 && this.queue.length > 0) {
                const next = this.queue.shift();
                if (!next) {
                    break;
                }
                this.tokens -= 1;
                next();
            }
        }
    }
    async schedule(callback) {
        return new Promise((resolve, reject) => {
            const execute = () => {
                callback().then(resolve, reject);
            };
            this.refill();
            if (this.tokens > 0) {
                this.tokens -= 1;
                execute();
                return;
            }
            this.queue.push(execute);
            const delay = Math.max(this.intervalMs - (Date.now() - this.lastRefill), 0);
            setTimeout(() => this.refill(), delay);
        });
    }
}
const tmdbRateLimiter = new RateLimiter(TMDB_MAX_REQUESTS, TMDB_REQUEST_INTERVAL_MS);
async function fetchJson(url) {
    const cacheKey = `url:${url}`;
    const cached = await getCache(cacheKey);
    if (cached !== undefined) {
        return cached;
    }
    let attempt = 0;
    let lastError = null;
    while (attempt < TMDB_MAX_RETRIES) {
        attempt += 1;
        const response = await tmdbRateLimiter.schedule(() => fetch(url, {
            headers: {
                Accept: 'application/json',
                ...authHeaders(),
            },
        }));
        if (response.ok) {
            const body = (await response.json());
            await setCache(cacheKey, body);
            return body;
        }
        if (response.status === 401) {
            throw new Error(`TMDB unauthorized 401: Invalid API key or token for ${url}`);
        }
        if (response.status === 404) {
            throw new Error(`TMDB request failed 404: Not Found for ${url}`);
        }
        if (response.status === 429 || response.status >= 500) {
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryDelay = parseRetryAfter(retryAfterHeader) ?? TMDB_RETRY_BASE_DELAY_MS * attempt;
            lastError = new Error(`TMDB request failed ${response.status}: ${response.statusText}`);
            if (attempt >= TMDB_MAX_RETRIES) {
                break;
            }
            await sleep(retryDelay);
            continue;
        }
        throw new Error(`TMDB request failed ${response.status}: ${response.statusText}`);
    }
    throw lastError ?? new Error('TMDB request failed after retries');
}
async function searchMovie(query, year) {
    const url = buildUrl('/search/movie', {
        query,
        year,
    });
    const data = await fetchJson(url);
    return data.results;
}
async function searchTv(query, year) {
    const url = buildUrl('/search/tv', {
        query,
        first_air_date_year: year,
    });
    const data = await fetchJson(url);
    return data.results;
}
async function searchPerson(query) {
    const url = buildUrl('/search/person', {
        query,
    });
    const data = await fetchJson(url);
    return data.results;
}
async function searchMulti(query) {
    const url = buildUrl('/search/multi', {
        query,
    });
    const data = await fetchJson(url);
    return data.results;
}
async function getConfiguration() {
    const url = buildUrl('/configuration');
    return fetchJson(url);
}
async function getMovieDetails(tmdbId) {
    const url = buildUrl(`/movie/${tmdbId}`, {
        append_to_response: 'credits,images,videos',
    });
    return fetchJson(url);
}
async function getTvDetails(tmdbId) {
    const url = buildUrl(`/tv/${tmdbId}`, {
        append_to_response: 'credits,images,content_ratings',
    });
    return fetchJson(url);
}
async function getTvSeason(tmdbId, seasonNumber) {
    const url = buildUrl(`/tv/${tmdbId}/season/${seasonNumber}`);
    return fetchJson(url);
}
async function getPersonDetails(personTmdbId) {
    const url = buildUrl(`/person/${personTmdbId}`);
    return fetchJson(url);
}
async function getPersonCombinedCredits(personTmdbId) {
    const url = buildUrl(`/person/${personTmdbId}/combined_credits`);
    return fetchJson(url);
}
async function getGenreListMovie() {
    const url = buildUrl('/genre/movie/list');
    return fetchJson(url);
}
async function getGenreListTv() {
    const url = buildUrl('/genre/tv/list');
    return fetchJson(url);
}
async function getMovieExternalIds(tmdbId) {
    const url = buildUrl(`/movie/${tmdbId}/external_ids`);
    return fetchJson(url);
}
async function getTvExternalIds(tmdbId) {
    const url = buildUrl(`/tv/${tmdbId}/external_ids`);
    return fetchJson(url);
}
async function getPersonExternalIds(personTmdbId) {
    const url = buildUrl(`/person/${personTmdbId}/external_ids`);
    return fetchJson(url);
}
async function getTvEpisodeDetails(tmdbId, seasonNumber, episodeNumber) {
    const url = buildUrl(`/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`, {
        append_to_response: 'credits',
    });
    return fetchJson(url);
}
async function getMovieImages(tmdbId) {
    const url = buildUrl(`/movie/${tmdbId}/images`);
    return fetchJson(url);
}
async function getTvImages(tmdbId) {
    const url = buildUrl(`/tv/${tmdbId}/images`);
    return fetchJson(url);
}
async function getPersonImages(personTmdbId) {
    const url = buildUrl(`/person/${personTmdbId}/images`);
    return fetchJson(url);
}
async function getMovieVideos(tmdbId) {
    const url = buildUrl(`/movie/${tmdbId}/videos`);
    return fetchJson(url);
}
async function getTvVideos(tmdbId) {
    const url = buildUrl(`/tv/${tmdbId}/videos`);
    return fetchJson(url);
}
async function getMovieRecommendations(tmdbId) {
    const url = buildUrl(`/movie/${tmdbId}/recommendations`);
    return fetchJson(url);
}
async function getMovieSimilar(tmdbId) {
    const url = buildUrl(`/movie/${tmdbId}/similar`);
    return fetchJson(url);
}
async function getTvRecommendations(tmdbId) {
    const url = buildUrl(`/tv/${tmdbId}/recommendations`);
    return fetchJson(url);
}
async function getTvSimilar(tmdbId) {
    const url = buildUrl(`/tv/${tmdbId}/similar`);
    return fetchJson(url);
}
async function getCollectionDetails(collectionId) {
    const url = buildUrl(`/collection/${collectionId}`);
    return fetchJson(url);
}
async function getTrending(mediaType, timeWindow) {
    const url = buildUrl(`/trending/${mediaType}/${timeWindow}`);
    return fetchJson(url);
}
async function getDiscoverMovie(filters) {
    const url = buildUrl('/discover/movie', filters);
    return fetchJson(url);
}
async function getDiscoverTv(filters) {
    const url = buildUrl('/discover/tv', filters);
    return fetchJson(url);
}
async function getChanges(startDate, endDate) {
    const movieChanges = await fetchJson(buildUrl('/movie/changes', {
        start_date: startDate,
        end_date: endDate,
    }));
    const tvChanges = await fetchJson(buildUrl('/tv/changes', {
        start_date: startDate,
        end_date: endDate,
    }));
    return {
        movie: movieChanges,
        tv: tvChanges,
    };
}
