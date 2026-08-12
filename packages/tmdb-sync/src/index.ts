import { prisma } from '@emdb/db';
import {
  getMovieDetails,
  getTvDetails,
  getPersonDetails,
  getTvSeason,
  getPersonExternalIds,
  getMovieRecommendations,
  getMovieSimilar,
  getTvRecommendations,
  getTvSimilar,
  getTvEpisodeDetails,
  getChanges,
  getPersonCombinedCredits,
} from '@emdb/tmdb-client';
import {
  mapTmdbEpisodeCredits,
  mapTmdbPersonExternalIds,
  mapTmdbMovieToTitle,
  mapTmdbTvToTitle,
  mapTmdbGenres,
  mapTmdbCountries,
  mapTmdbCredits,
  mapTmdbSeason,
  mapTmdbEpisode,
  mapTmdbPerson,
  resolveCrewRole,
} from '@emdb/tmdb-mapper';
import { getWikipediaUrlFromWikidataId } from '@emdb/wikidata-client';

export { resolveCrewRole };

const ROLE_LIBELLES: Record<string, string> = {
  acteur: 'Acteur',
  realisateur: 'Réalisateur',
  scenariste: 'Scénariste',
  autre: 'Autre',
};

async function ensureRoleId(code: string, libelle?: string) {
  const resolvedLibelle = libelle ?? ROLE_LIBELLES[code] ?? 'Autre';

  const roleRecord = await prisma.roles.upsert({
    where: { code },
    update: { libelle: resolvedLibelle },
    create: { code, libelle: resolvedLibelle },
  });

  return roleRecord.id;
}

/**
 * Crée le credit reliant une personne déjà connue (person_id) à un titre déjà
 * importé (title_id), sans importer le reste du casting/équipe du titre.
 * Utilisé par le refresh de filmographie (bug 27) : contrairement à
 * importTitleByTmdbId, on connaît déjà la personne et son rôle exact via
 * getPersonCombinedCredits, donc pas besoin de réimporter tous les autres
 * membres du casting pour retrouver cette seule ligne de credit.
 */
export async function ensureCreditRecord(params: {
  titleId: string;
  personId: string;
  role: string;
  roleLibelle: string;
  personnage?: string | null;
  ordre?: number | null;
  episodeId?: string | null;
}) {
  const roleId = await ensureRoleId(params.role, params.roleLibelle);
  try {
    await prisma.credits.create({
      data: {
        title_id: params.titleId,
        person_id: params.personId,
        episode_id: params.episodeId ?? null,
        role_id: roleId,
        personnage: params.personnage ?? null,
        ordre: params.ordre ?? null,
        source: 'tmdb',
      },
    });
  } catch (error: any) {
    if (/duplicate key/i.test(error.message) || /unique constraint/.test(error.message)) {
      return;
    }
    throw error;
  }
}

type SyncAction = 'importTitle' | 'importPerson' | 'dailySyncNewEpisodes' | 'weeklyResyncChanges';

async function createSyncLog(params: {
  tmdb_id: number;
  type: string;
  action: SyncAction;
  status: 'started' | 'success' | 'failed';
  error?: string | null;
}) {
  await prisma.tmdb_sync_log.create({
    data: {
      tmdb_id: params.tmdb_id,
      type: params.type,
      action: params.action,
      status: params.status,
      error: params.error ?? null,
    },
  });
}

export async function importPersonByTmdbId(tmdbId: number) {
  // Court-circuit si la personne existe déjà localement — sans ça, importer
  // un titre au casting/équipe nombreux (parfois 100+ credits) déclenchait
  // 2 appels TMDB PAR personne, même pour des personnes déjà connues, ce qui
  // pouvait dépasser n'importe quel timeout client (bug #35 : "The operation
  // was aborted" sur les recommandations non-locales).
  const existing = await prisma.people.findUnique({ where: { tmdb_id: tmdbId } });
  if (existing) {
    return existing;
  }

  const tmdbPerson = await getPersonDetails(tmdbId);
  // wiki_url n'est PLUS résolu ici : cet appel Wikidata est un enrichissement
  // facultatif pour UNE personne parmi potentiellement 100+ credits importés
  // en parallèle (Promise.all) — un aléa réseau Wikidata sur un seul d'entre
  // eux faisait échouer l'import du TITRE ENTIER (bug remonté : import d'un
  // titre au casting nombreux qui "tourne dans le vide" puis affiche une
  // TypeError "fetch failed" côté page titre). Résolu à la demande, plus
  // tard, par `resolvePersonWikiUrl` — appelée uniquement quand la fiche de
  // CETTE personne est consultée, jamais pendant un import de titre.
  const mappedPerson = mapTmdbPerson(tmdbPerson, null);

  const person = await prisma.people.upsert({
    where: { tmdb_id: tmdbId },
    update: mappedPerson,
    create: mappedPerson,
  });

  return person;
}

/**
 * Résout l'URL Wikipedia d'une personne à la demande — appelée uniquement
 * quand sa fiche (GET /people/:id) est consultée, jamais pendant un import
 * de titre (cf. importPersonByTmdbId, qui ne résout plus wiki_url du tout).
 *
 * `people.wiki_url` sert de cache d'écriture : déjà résolu → retourné sans
 * appel réseau ; sinon résolu via Wikidata puis persisté pour les
 * consultations suivantes (évite de re-frapper l'API Wikidata, sujette au
 * rate-limit, à chaque vue de la même fiche). Toute erreur (réseau, 429,
 * personne sans wikidata_id) est avalée : wiki_url reste null, retenté à la
 * prochaine consultation.
 */
export async function resolvePersonWikiUrl(personId: string): Promise<string | null> {
  const person = await prisma.people.findUnique({
    where: { id: personId },
    select: { tmdb_id: true, wiki_url: true },
  });
  if (!person) return null;
  if (person.wiki_url) return person.wiki_url;
  if (!person.tmdb_id) return null;

  try {
    const externalIds = await getPersonExternalIds(person.tmdb_id);
    const { wikidata_id } = mapTmdbPersonExternalIds(externalIds);
    if (!wikidata_id) return null;

    const wikiUrl = await getWikipediaUrlFromWikidataId(wikidata_id);
    if (wikiUrl) {
      await prisma.people.update({ where: { id: personId }, data: { wiki_url: wikiUrl } });
    }
    return wikiUrl;
  } catch {
    return null;
  }
}

export async function importEpisodeGuestCredits(
  episodeId: string,
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
) {
  const episodeDetails = await getTvEpisodeDetails(tmdbId, seasonNumber, episodeNumber);
  const credits = mapTmdbEpisodeCredits(episodeDetails, episodeId);

  const title = await prisma.titles.findUnique({
    where: { tmdb_id: episodeDetails.show.id },
  });

  if (!title) {
    throw new Error('Titre local introuvable pour le show TMDB');
  }

  for (const credit of credits) {
    const person = await importPersonByTmdbId(credit.tmdb_person_id);
    const roleId = await ensureRoleId(credit.role);

    try {
      await prisma.credits.create({
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
    } catch (error: any) {
      if (/duplicate key/i.test(error.message) || /unique constraint/.test(error.message)) {
        continue;
      }
      throw error;
    }
  }
}

async function ensureGenreIds(genres: { id: number; name: string }[]) {
  const ids: string[] = [];

  for (const genre of mapTmdbGenres(genres)) {
    if (!genre.nom) {
      continue;
    }

    // Le seed initial des genres (packages/db/seed/seed_genres.ts) demande
    // TMDB en français (noms accentués : "Aventure", "Science-Fiction"...),
    // mais les endpoints d'import de titre (getMovieDetails/getTvDetails)
    // n'envoient aucun paramètre de langue et reçoivent donc les noms TMDB
    // en anglais. Un upsert par `nom` seul créait alors un doublon en
    // anglais avec le MÊME tmdb_id qu'une ligne française déjà seedée —
    // violation de la contrainte unique sur `tmdb_id`. On regarde donc
    // d'abord si le tmdb_id est déjà connu (peu importe le nom en base) ;
    // seul un tmdb_id réellement inédit retombe sur l'upsert par nom
    // (comportement du bug #7 : un genre existant sous un autre tmdb_id).
    let record = await prisma.genres.findUnique({ where: { tmdb_id: genre.tmdb_id } });

    if (!record) {
      record = await prisma.genres.upsert({
        where: { nom: genre.nom },
        create: {
          nom: genre.nom,
          tmdb_id: genre.tmdb_id,
        },
        update: {
          tmdb_id: genre.tmdb_id,
        },
      });
    }
    ids.push(record.id);
  }

  return ids;
}

async function ensureCountryIds(countries: { iso_3166_1: string; name: string }[]) {
  const ids: string[] = [];

  for (const country of mapTmdbCountries(countries)) {
    const record = await prisma.countries.upsert({
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

async function ensureStudioIds(
  companies: { id: number; name: string; logo_path?: string | null }[],
) {
  const ids: string[] = [];

  for (const company of companies) {
    if (!company.name) {
      continue;
    }

    const logoUrl = company.logo_path
      ? `https://image.tmdb.org/t/p/w200${company.logo_path}`
      : null;

    const record = await prisma.studios.upsert({
      where: { tmdb_id: company.id },
      create: {
        tmdb_id: company.id,
        nom: company.name,
        logo_url: logoUrl,
      },
      update: {
        nom: company.name,
        logo_url: logoUrl,
      },
    });
    ids.push(record.id);
  }

  return ids;
}

export async function importTitleByTmdbId(
  tmdbId: number,
  type: 'film' | 'serie',
  options: { withCredits?: boolean; creditRoles?: string[] } = {},
) {
  const withCredits = options.withCredits ?? true;
  console.log('[importTitleByTmdbId] start', tmdbId, type);
  await createSyncLog({
    tmdb_id: tmdbId,
    type,
    action: 'importTitle',
    status: 'started',
  });

  try {
    console.log('[importTitleByTmdbId] fetch tmdb', tmdbId, type);
    const tmdbData = type === 'film' ? await getMovieDetails(tmdbId) : await getTvDetails(tmdbId);
    console.log('[importTitleByTmdbId] tmdb fetched', tmdbId, type, !!tmdbData);
    const titlePayload =
      type === 'film' ? mapTmdbMovieToTitle(tmdbData) : mapTmdbTvToTitle(tmdbData);

    console.log('[importTitleByTmdbId] upsert', tmdbId, type);
    const title = await prisma.titles.upsert({
      where: { tmdb_id: tmdbId },
      create: titlePayload,
      update: titlePayload,
    });
    console.log('[importTitleByTmdbId] upsert done', tmdbId, type, title.id);

    if (tmdbData.genres?.length) {
      console.log('[importTitleByTmdbId] genres', tmdbId, tmdbData.genres.length);
      const genreIds = await ensureGenreIds(tmdbData.genres);
      await prisma.title_genres.createMany({
        data: genreIds.map((genreId) => ({ title_id: title.id, genre_id: genreId })),
        skipDuplicates: true,
      });
    }

    if (tmdbData.production_countries?.length) {
      console.log('[importTitleByTmdbId] countries', tmdbId, tmdbData.production_countries.length);
      const countryIds = await ensureCountryIds(tmdbData.production_countries);
      await prisma.title_countries.createMany({
        data: countryIds.map((countryId) => ({ title_id: title.id, country_id: countryId })),
        skipDuplicates: true,
      });
    }

    if (tmdbData.production_companies?.length) {
      console.log('[importTitleByTmdbId] studios', tmdbId, tmdbData.production_companies.length);
      const studioIds = await ensureStudioIds(tmdbData.production_companies);
      await prisma.title_studios.createMany({
        data: studioIds.map((studioId) => ({ title_id: title.id, studio_id: studioId })),
        skipDuplicates: true,
      });
    }

    if (withCredits && tmdbData.credits) {
      console.log('[importTitleByTmdbId] credits', tmdbId, tmdbData.credits?.cast?.length, tmdbData.credits?.crew?.length);
      let creditInserts = mapTmdbCredits(tmdbData.credits, title.id, null);
      if (options.creditRoles?.length) {
        creditInserts = creditInserts.filter((credit) => options.creditRoles!.includes(credit.role));
      }
      // En parallèle plutôt qu'un `for` séquentiel — un titre à l'équipe
      // nombreuse (100+ credits) pouvait sinon dépasser n'importe quel
      // timeout client rien qu'en attendant chaque personne l'une après
      // l'autre (bug #35). Le `RateLimiter` de tmdb-client sérialise déjà
      // les vrais appels réseau à leur cadence configurée, donc paralléliser
      // ici ne fait que mieux utiliser ce quota au lieu de le sous-exploiter.
      // Un credit qui échoue (aléa réseau TMDB sur cette personne précise,
      // etc.) est journalisé et ignoré plutôt que de faire échouer tout
      // l'import — même raisonnement que le catch duplicate-key ci-dessous,
      // étendu à l'ensemble de l'étape (bug remonté : le bouton "Actualiser"
      // échouait souvent sur les titres à l'équipe nombreuse, un seul aléa
      // parmi la centaine d'appels suffisant à tout faire échouer).
      await Promise.all(
        creditInserts.map(async (credit) => {
          try {
            const person = await importPersonByTmdbId(credit.tmdb_person_id);
            const roleId = await ensureRoleId(credit.role, credit.role_libelle);
            await prisma.credits.create({
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
          } catch (error: any) {
            if (/duplicate key/i.test(error.message) || /unique constraint/.test(error.message)) {
              return;
            }
            console.error('[importTitleByTmdbId] credit failed', tmdbId, credit.tmdb_person_id, error?.message);
          }
        }),
      );
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
  } catch (error: any) {
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

/**
 * Importe/complète le casting+équipe d'un titre déjà connu localement, sans
 * toucher au reste de ses métadonnées (genres/pays/studios/saisons) — chemin
 * dédié pour un backfill de credits en masse (ex. `credits-import.worker.ts`)
 * après un import Trakt réalisé avec `withCredits: false` pour rester rapide.
 */
export async function importCreditsForTitle(
  titleId: string,
  options: { creditFilter?: string[] } = {},
) {
  const title = await prisma.titles.findUnique({ where: { id: titleId } });
  if (!title?.tmdb_id) {
    throw new Error('Titre introuvable ou sans tmdb_id');
  }

  const tmdbData =
    title.type === 'film' ? await getMovieDetails(title.tmdb_id) : await getTvDetails(title.tmdb_id);

  if (!tmdbData.credits) {
    return { imported: 0 };
  }

  let creditInserts = mapTmdbCredits(tmdbData.credits, title.id, null);
  if (options.creditFilter?.length) {
    creditInserts = creditInserts.filter((credit) => options.creditFilter!.includes(credit.role));
  }

  let imported = 0;

  // En parallèle plutôt qu'un `for` séquentiel — même raisonnement que dans
  // `importTitleByTmdbId` (bug #35) : le `RateLimiter` de tmdb-client
  // sérialise déjà les vrais appels réseau à leur cadence configurée.
  // Un credit qui échoue (aléa réseau TMDB sur cette personne précise, etc.)
  // est journalisé et ignoré plutôt que de faire échouer tout le backfill —
  // même raisonnement que importTitleByTmdbId.
  await Promise.all(
    creditInserts.map(async (credit) => {
      try {
        const person = await importPersonByTmdbId(credit.tmdb_person_id);
        const roleId = await ensureRoleId(credit.role, credit.role_libelle);
        await prisma.credits.create({
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
        imported++;
      } catch (error: any) {
        if (/duplicate key/i.test(error.message) || /unique constraint/.test(error.message)) {
          return;
        }
        console.error('[importCreditsForTitle] credit failed', titleId, credit.tmdb_person_id, error?.message);
      }
    }),
  );

  return { imported };
}

export async function importSeasonsForSerie(titleId: string) {
  const title = await prisma.titles.findUnique({ where: { id: titleId } });
  if (!title?.tmdb_id || title.type !== 'serie') {
    throw new Error('Titre introuvable, non-série ou sans tmdb_id');
  }

  const tvDetails = await getTvDetails(title.tmdb_id);
  const seasons = tvDetails.seasons || [];

  for (const seasonSummary of seasons) {
    const seasonDetails = await getTvSeason(title.tmdb_id, seasonSummary.season_number);
    const seasonPayload = mapTmdbSeason(seasonDetails, titleId);

    const season = await prisma.seasons.upsert({
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
      const episodePayload = mapTmdbEpisode(episode, season.id);
      await prisma.episodes.upsert({
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

export async function refreshPersonData(personId: string) {
  const person = await prisma.people.findUnique({ where: { id: personId } });
  if (!person?.tmdb_id) {
    throw new Error('Personne introuvable ou sans tmdb_id');
  }

  const tmdbPerson = await getPersonDetails(person.tmdb_id);
  const externalIds = await getPersonExternalIds(person.tmdb_id);
  const { wikidata_id } = mapTmdbPersonExternalIds(externalIds);
  const wikiUrl = wikidata_id ? await getWikipediaUrlFromWikidataId(wikidata_id) : null;

  return prisma.people.update({
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

export async function refreshTitleData(titleId: string) {
  const title = await prisma.titles.findUnique({ where: { id: titleId } });
  if (!title?.tmdb_id) {
    throw new Error('Titre introuvable ou sans tmdb_id');
  }

  const tmdbData =
    title.type === 'film'
      ? await getMovieDetails(title.tmdb_id)
      : await getTvDetails(title.tmdb_id);

  const updatePayload =
    title.type === 'film' ? mapTmdbMovieToTitle(tmdbData) : mapTmdbTvToTitle(tmdbData);

  const updated = await prisma.titles.update({
    where: { id: titleId },
    data: updatePayload,
  });

  if (title.type === 'serie') {
    await importSeasonsForSerie(titleId);
  }

  return updated;
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
export async function generateNewEpisodeNotifications(): Promise<number> {
  const series = await prisma.titles.findMany({
    where: {
      type: 'serie',
      statut_serie: { in: ['en_cours', 'retourne'] },
      next_episode_air_date: { lte: new Date() },
    },
    select: { id: true, titre_vo: true },
  });

  if (series.length === 0) return 0;

  let totalNotifications = 0;

  for (const serie of series) {
    const followers = await prisma.user_follows_serie.findMany({
      where: { title_id: serie.id },
      select: { user_id: true },
    });

    if (followers.length === 0) continue;

    const latestEpisode = await prisma.episodes.findFirst({
      where: {
        seasons: { title_id: serie.id },
        date_sortie: { lte: new Date() },
      },
      orderBy: { date_sortie: 'desc' },
      select: { id: true, numero: true, titre: true },
    });

    if (!latestEpisode) continue;

    const existingNotif = await prisma.notifications.findFirst({
      where: {
        episode_id: latestEpisode.id,
        type: 'new_episode',
      },
    });

    if (existingNotif) continue;

    const notifications = followers.map((f) => ({
      user_id: f.user_id,
      episode_id: latestEpisode.id,
      type: 'new_episode',
      lu: false,
    }));

    await prisma.notifications.createMany({ data: notifications });
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
export async function generateSeasonPremiereNotification(
  titleId: string,
  seasonNumber: number,
): Promise<number> {
  const followers = await prisma.user_follows_serie.findMany({
    where: { title_id: titleId },
    select: { user_id: true },
  });

  if (followers.length === 0) return 0;

  const firstEpisode = await prisma.episodes.findFirst({
    where: {
      seasons: { title_id: titleId, numero: seasonNumber },
    },
    orderBy: { numero: 'asc' },
    select: { id: true },
  });

  if (!firstEpisode) return 0;

  const existingNotif = await prisma.notifications.findFirst({
    where: {
      episode_id: firstEpisode.id,
      type: 'season_premiere',
    },
  });

  if (existingNotif) return 0;

  const notifications = followers.map((f) => ({
    user_id: f.user_id,
    episode_id: firstEpisode.id,
    type: 'season_premiere',
    lu: false,
  }));

  await prisma.notifications.createMany({ data: notifications });
  return notifications.length;
}

export async function dailySyncNewEpisodes() {
  const titles = await prisma.titles.findMany({
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

/**
 * Pour chaque personne suivie par au moins un utilisateur, vérifie ses
 * crédits combinés TMDB (cast + équipe) et ajoute automatiquement à la
 * watchlist de CHAQUE utilisateur qui la suit tout titre pas encore sorti
 * (annoncé/à venir) découvert — cron quotidien, même métronome que
 * dailySyncNewEpisodes.
 *
 * Ne considère que les titres "futurs" (date de sortie/diffusion dans le
 * futur) — pas tout le catalogue déjà sorti d'une personne, qui serait
 * redondant avec sa filmographie.
 *
 * @returns Nombre d'ajouts effectifs à une watchlist (déduplique déjà
 *   gérée par l'upsert list_items, idempotent)
 */
export async function checkFollowedPersonsForNewTitles(): Promise<{ titlesAdded: number }> {
  const followedPersonIds = await prisma.user_follows_person.findMany({
    select: { person_id: true },
    distinct: ['person_id'],
  });

  let titlesAdded = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const { person_id } of followedPersonIds) {
    const person = await prisma.people.findUnique({
      where: { id: person_id },
      select: { id: true, tmdb_id: true },
    });
    if (!person?.tmdb_id) continue;

    const followers = await prisma.user_follows_person.findMany({
      where: { person_id },
      select: { user_id: true },
    });
    if (followers.length === 0) continue;

    let combined: any;
    try {
      combined = await getPersonCombinedCredits(person.tmdb_id);
    } catch (error) {
      console.warn(`[checkFollowedPersonsForNewTitles] Échec crédits TMDB personne ${person.tmdb_id}:`, error);
      continue;
    }

    const allCredits: any[] = [...(combined.cast ?? []), ...(combined.crew ?? [])];
    const upcoming = allCredits.filter((credit) => {
      const releaseDate = credit.release_date || credit.first_air_date;
      return !!releaseDate && releaseDate > today;
    });
    if (upcoming.length === 0) continue;

    const seenTmdbIds = new Set<number>();

    for (const credit of upcoming) {
      if (seenTmdbIds.has(credit.id)) continue;
      seenTmdbIds.add(credit.id);

      const type: 'film' | 'serie' = credit.media_type === 'tv' || credit.first_air_date ? 'serie' : 'film';

      let title = await prisma.titles.findUnique({
        where: { tmdb_id: credit.id },
        select: { id: true },
      });
      if (!title) {
        try {
          title = await importTitleByTmdbId(credit.id, type, { withCredits: false });
        } catch (error) {
          console.warn(`[checkFollowedPersonsForNewTitles] Échec import titre TMDB ${credit.id}:`, error);
          continue;
        }
      }

      for (const { user_id } of followers) {
        try {
          let watchlist = await prisma.user_lists.findFirst({
            where: { user_id, type: 'watchlist' },
            orderBy: { created_at: 'asc' },
          });
          if (!watchlist) {
            watchlist = await prisma.user_lists.create({
              data: { user_id, nom: 'Ma Watchlist', type: 'watchlist' },
            });
          }

          await prisma.list_items.upsert({
            where: { list_id_title_id: { list_id: watchlist.id, title_id: title.id } },
            update: {},
            create: { list_id: watchlist.id, title_id: title.id },
          });
          titlesAdded++;
        } catch (error) {
          console.warn(
            `[checkFollowedPersonsForNewTitles] Échec ajout watchlist (user ${user_id}, titre ${title.id}):`,
            error,
          );
        }
      }
    }
  }

  return { titlesAdded };
}

export async function weeklyResyncChanges(startDate: string, endDate: string) {
  const changes = await getChanges(startDate, endDate);
  const updatedTitles: Array<{ tmdbId: number; type: 'film' | 'serie' }> = [];

  for (const movieChange of changes.movie?.results || []) {
    const title = await prisma.titles.findUnique({
      where: { tmdb_id: movieChange.id },
    });

    if (!title || title.type !== 'film') {
      continue;
    }

    await importTitleByTmdbId(movieChange.id, 'film');
    updatedTitles.push({ tmdbId: movieChange.id, type: 'film' });
  }

  for (const tvChange of changes.tv?.results || []) {
    const title = await prisma.titles.findUnique({
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
export async function bootstrapPersonRecommendationsFromTmdb(personId: string): Promise<number> {
  const person = await prisma.people.findUnique({
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
  const tmdbCredits = await getPersonCombinedCredits(person.tmdb_id);

  // 2. Extraire les TMDB IDs des titres où la personne a participé
  const tmdbTitleIds = new Set<number>();
  for (const credit of [...(tmdbCredits.cast ?? []), ...(tmdbCredits.crew ?? [])]) {
    if (credit.id) {
      tmdbTitleIds.add(credit.id);
    }
  }

  if (tmdbTitleIds.size === 0) {
    return 0; // Aucun credit TMDB → pas de recommandations possibles
  }

  // 3. Trouver les titres locaux correspondant à ces TMDB IDs
  const localTitles = await prisma.titles.findMany({
    where: { tmdb_id: { in: Array.from(tmdbTitleIds) } },
    select: { id: true },
  });

  const localTitleIds = localTitles.map((t) => t.id);
  if (localTitleIds.length === 0) {
    return 0; // Aucun titre local → pas de base pour calculer la similarité
  }

  // 4. Trouver les autres personnes ayant participé aux mêmes titres locaux
  const otherCredits = await prisma.credits.findMany({
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
  const personTitles = new Map<string, Set<string>>();
  for (const credit of otherCredits) {
    if (!personTitles.has(credit.person_id)) {
      personTitles.set(credit.person_id, new Set());
    }
    personTitles.get(credit.person_id)!.add(credit.title_id);
  }

  // 6. Calculer le score Jaccard pour chaque personne candidate
  const personTitleSet = new Set(localTitleIds);
  const candidates: Array<{ personId: string; score: number }> = [];

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
    await prisma.$transaction(async (tx) => {
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

export async function bootstrapRecommendationsFromTmdb(titleId: string) {
  const title = await prisma.titles.findUnique({ where: { id: titleId } });
  if (!title?.tmdb_id) {
    throw new Error('Titre introuvable ou sans tmdb_id');
  }

  const tmdbId = title.tmdb_id;
  const recommendationFetcher =
    title.type === 'film'
      ? () => Promise.all([getMovieRecommendations(tmdbId), getMovieSimilar(tmdbId)])
      : () => Promise.all([getTvRecommendations(tmdbId), getTvSimilar(tmdbId)]);

  const [recommendations, similar] = await recommendationFetcher();

  const records = [] as Array<{ title_id: string; recommended_id: string; score: number }>;

  for (const rec of [...recommendations.results, ...similar.results]) {
    if (!rec.id) continue;
    const existingTitle = await prisma.titles.findUnique({ where: { tmdb_id: rec.id } });
    if (!existingTitle) continue;
    records.push({
      title_id: titleId,
      recommended_id: existingTitle.id,
      score: rec.vote_average ? Number(rec.vote_average) / 10 : 0,
    });
  }

  if (records.length > 0) {
    await prisma.title_recommendations.createMany({ data: records, skipDuplicates: true });
  }

  return records;
}
