import * as cheerio from 'cheerio';

/**
 * Recherche + vérification d'un film complet sur Internet Archive (API
 * publique archive.org, gratuite et sans clé — contrairement à l'API de
 * recherche YouTube, limitée à ~100 requêtes gratuites/jour, incompatible
 * avec une validation automatique à chaque visite de fiche film).
 *
 * archive.org héberge énormément de contenu hors-sujet même filtré sur
 * `mediatype:movies` (clips YouTube mirorrés, making-of, gameplay...) : le
 * matching ci-dessous est volontairement strict (titre normalisé + liste de
 * mots-clés à exclure) pour éviter de proposer un faux lien.
 */

const ARCHIVE_SEARCH_URL = 'https://archive.org/advancedsearch.php';

const BLACKLIST_KEYWORDS = [
  'trailer',
  'bande-annonce',
  'bande annonce',
  'clip',
  'extrait',
  'making of',
  'behind the scenes',
  'coulisses',
  'review',
  'critique',
  'reaction',
  'bloopers',
  'easter egg',
  "let's play",
  'walkthrough',
  'gameplay',
  'interview',
  'featurette',
  'teaser',
  'recap',
  'résumé',
  'explained',
  'expliqué',
  'breakdown',
  'analyse',
  'parody',
  'parodie',
  'soundtrack',
  ' ost ',
  'compilation',
  'best of',
  'top 10',
  'fan film',
  'fan-made',
  'commentary',
  'commentaire',
  'deleted scene',
  'scène coupée',
  'preview',
  'aperçu',
];

type ArchiveDoc = {
  identifier: string;
  title?: string;
  year?: number;
  language?: string | string[];
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCleanMatch(resultTitle: string, queryTitle: string): boolean {
  const normResult = normalize(resultTitle);
  const normQuery = normalize(queryTitle);
  if (!normQuery) return false;

  if (BLACKLIST_KEYWORDS.some((kw) => normResult.includes(normalize(kw)))) {
    return false;
  }

  // Titre exact, ou titre + année (4 chiffres) uniquement — pas de "starts
  // with" permissif : un item "Inception CD ROM" (objet sans rapport,
  // mal étiqueté mediatype:movies) matchait sinon "Inception" à tort.
  // `normalize()` ne laisse que [a-z0-9\s], le titre normalisé ne contient
  // donc aucun caractère spécial à échapper pour la regex.
  if (normResult === normQuery) return true;
  const yearSuffixPattern = new RegExp(`^${normQuery} \\d{4}$`);
  return yearSuffixPattern.test(normResult);
}

function detectLanguageLabel(language?: string | string[]): 'VO' | 'VF' | null {
  if (!language) return null;
  const codes = (Array.isArray(language) ? language : [language]).map((l) =>
    l.toLowerCase(),
  );
  if (codes.some((c) => c.startsWith('fre') || c.startsWith('fra') || c === 'fr')) {
    return 'VF';
  }
  if (codes.length > 0) return 'VO';
  return null;
}

async function searchOnce(
  query: string,
  anneeSortie?: number,
): Promise<{ url: string; language?: string | string[] } | null> {
  const params = new URLSearchParams({
    q: `title:(${query}) AND mediatype:(movies)`,
    'fl[]': 'identifier',
    rows: '10',
    output: 'json',
  });
  params.append('fl[]', 'title');
  params.append('fl[]', 'year');
  params.append('fl[]', 'language');

  const res = await fetch(`${ARCHIVE_SEARCH_URL}?${params.toString()}`);
  if (!res.ok) return null;

  const data = (await res.json()) as { response?: { docs?: ArchiveDoc[] } };
  const docs = data.response?.docs ?? [];

  const match = docs.find((doc) => {
    if (!doc.title || !isCleanMatch(doc.title, query)) return false;
    if (anneeSortie && doc.year) {
      return Math.abs(doc.year - anneeSortie) <= 1;
    }
    return true;
  });

  if (!match) return null;

  return {
    url: `https://archive.org/details/${match.identifier}`,
    language: match.language,
  };
}

export async function findArchiveOrgFilm(params: {
  titreVo: string;
  titreVf?: string | null;
  anneeSortie?: number | null;
}): Promise<{ url: string; label: 'VO' | 'VF' | null } | null> {
  const { titreVo, titreVf, anneeSortie } = params;

  const vo = await searchOnce(titreVo, anneeSortie ?? undefined);
  if (vo) {
    return { url: vo.url, label: detectLanguageLabel(vo.language) };
  }

  if (titreVf && normalize(titreVf) !== normalize(titreVo)) {
    const vf = await searchOnce(titreVf, anneeSortie ?? undefined);
    if (vf) {
      return { url: vf.url, label: detectLanguageLabel(vf.language) ?? 'VF' };
    }
  }

  return null;
}

/**
 * Sites "gratuits" whitelistés (WatchTV, HydraFlix, MovieDB Wiki) — recherche
 * + vérification, plutôt qu'une URL devinée puis simplement testée en HEAD
 * (ancienne approche, peu fiable : slug parfois différent, faux négatifs sur
 * pages "introuvable" renvoyées avec un statut 200, aucune vérification que
 * la page trouvée est vraiment LE bon titre).
 *
 * Stratégie en deux temps par site :
 * 1. Essai direct sur l'URL devinée à partir du titre (rapide, fonctionne la
 *    majorité du temps) — la page est chargée et son <title> vérifié (pas de
 *    "page not found"/"404", ces sites renvoient parfois un statut 200 sur
 *    une page "introuvable" générique).
 * 2. Sinon, recherche via la barre de recherche du site (`?s=` ou
 *    équivalent), résultats parsés (cheerio) puis scorés :
 *    - correspondance du hash d'affiche TMDB (nom de fichier de l'image
 *      poster, ex. "jkixsXzRh28q3PCqFoWcf7unghT.jpg") si disponible : signal
 *      fiable à 100%, ces sites récupèrent leurs affiches directement depuis
 *      image.tmdb.org avec le même hash que notre propre `affiche_url` ;
 *    - sinon titre + année normalisés.
 *
 * La recherche essaie le titre VO puis VF (si différent) : un titre non
 * anglophone (`titre_vo` = titre original, parfois non-anglais même pour un
 * import francophone) peut ne matcher aucun des deux sur un site
 * majoritairement anglophone — le hash d'affiche compense alors ce
 * décalage linguistique en confirmant/infirmant les candidats trouvés.
 */

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'title'
  );
}

/** Nom de fichier TMDB (hash + extension) extrait d'une URL d'image
 * image.tmdb.org — indépendant de la taille demandée (w185/w500/original). */
export function extractPosterHash(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/([a-zA-Z0-9]+\.(?:jpg|jpeg|png|webp))(?:[?#].*)?$/i);
  return match ? match[1] : null;
}

async function fetchHtml(url: string): Promise<{ status: number; html: string } | null> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });
    const html = res.ok ? await res.text() : '';
    return { status: res.status, html };
  } catch {
    return null;
  }
}

export function isSoftNotFound(pageTitle: string): boolean {
  return /page not found|404|not found/i.test(pageTitle);
}

export type FreeSiteMatch = { url: string; matchedBy: 'poster' | 'title-year' | 'title' };

type SearchCandidate = {
  url: string;
  title: string;
  posterHash: string | null;
  year: number | null;
};

export function pickBestCandidate(
  candidates: SearchCandidate[],
  query: string,
  posterHash: string | null,
  year: number | null,
): FreeSiteMatch | null {
  if (posterHash) {
    const posterMatch = candidates.find((c) => c.posterHash === posterHash);
    if (posterMatch) return { url: posterMatch.url, matchedBy: 'poster' };
  }

  const normQuery = normalize(query);
  const titleMatch = candidates.find((c) => {
    if (normalize(c.title) !== normQuery) return false;
    if (!year || !c.year) return true;
    return Math.abs(c.year - year) <= 1;
  });
  if (titleMatch) return { url: titleMatch.url, matchedBy: 'title-year' };

  return null;
}

type FreeSiteQuery = {
  titreVo: string;
  titreVf?: string | null;
  type: 'film' | 'serie';
  posterHash: string | null;
  year: number | null;
};

async function findOnWatchTv(params: FreeSiteQuery): Promise<FreeSiteMatch | null> {
  const typeSegment = params.type === 'film' ? 'movie' : 'series';
  const directUrl = `https://www.watchtv.click/${typeSegment}/${slugify(params.titreVo)}/`;
  const direct = await fetchHtml(directUrl);
  if (direct && direct.status === 200) {
    const $ = cheerio.load(direct.html);
    if (!isSoftNotFound($('title').first().text())) {
      return { url: directUrl, matchedBy: 'title' };
    }
  }

  const queries = params.titreVf && params.titreVf !== params.titreVo
    ? [params.titreVo, params.titreVf]
    : [params.titreVo];

  for (const query of queries) {
    const search = await fetchHtml(`https://www.watchtv.click/?s=${encodeURIComponent(query)}`);
    if (!search || search.status !== 200) continue;

    const $ = cheerio.load(search.html);
    const candidates: SearchCandidate[] = [];
    $('article.TPost').each((_, el) => {
      const $el = $(el);
      const href = $el.find('a').first().attr('href')?.split('?')[0];
      const title = $el.find('h2.Title, .Title').first().text().trim();
      if (!href || !title) return;
      const posterSrc = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
      const yearText = $el.find('.Qlty.Yr, .Date').first().text().trim();
      candidates.push({
        url: href,
        title,
        posterHash: extractPosterHash(posterSrc),
        year: yearText ? parseInt(yearText, 10) || null : null,
      });
    });

    const best = pickBestCandidate(candidates, query, params.posterHash, params.year);
    if (best) return best;
  }

  return null;
}

async function findOnHydraflix(params: FreeSiteQuery): Promise<FreeSiteMatch | null> {
  const directUrl = `https://www.hydraflix.cc/${slugify(params.titreVo)}/`;
  const direct = await fetchHtml(directUrl);
  if (direct && direct.status === 200) {
    const $ = cheerio.load(direct.html);
    if (!isSoftNotFound($('title').first().text())) {
      return { url: directUrl, matchedBy: 'title' };
    }
  }

  const queries = params.titreVf && params.titreVf !== params.titreVo
    ? [params.titreVo, params.titreVf]
    : [params.titreVo];

  for (const query of queries) {
    const search = await fetchHtml(`https://www.hydraflix.cc/?s=${encodeURIComponent(query)}`);
    if (!search || search.status !== 200) continue;

    const $ = cheerio.load(search.html);
    const candidates: SearchCandidate[] = [];
    $('[id^="post-"]').each((_, el) => {
      const $el = $(el);
      const href = $el.find('.poster a, .meta a').first().attr('href')?.split('?')[0];
      const title = $el.find('.meta a').last().text().trim();
      if (!href || !title) return;
      const posterSrc = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
      const yearText = $el.find('.meta span').first().text().trim();
      candidates.push({
        url: href,
        title,
        posterHash: extractPosterHash(posterSrc),
        year: yearText ? parseInt(yearText, 10) || null : null,
      });
    });

    const best = pickBestCandidate(candidates, query, params.posterHash, params.year);
    if (best) return best;
  }

  return null;
}

async function findOnMoviedbWiki(params: FreeSiteQuery): Promise<FreeSiteMatch | null> {
  const typeSegment = params.type === 'film' ? 'movies' : 'tv';
  const directUrl = `https://www.moviedb.wiki/${typeSegment}/${slugify(params.titreVo)}/`;
  const direct = await fetchHtml(directUrl);
  if (direct && direct.status === 200) {
    const $ = cheerio.load(direct.html);
    if (!isSoftNotFound($('title').first().text())) {
      return { url: directUrl, matchedBy: 'title' };
    }
  }

  const queries = params.titreVf && params.titreVf !== params.titreVo
    ? [params.titreVo, params.titreVf]
    : [params.titreVo];

  for (const query of queries) {
    const search = await fetchHtml(`https://www.moviedb.wiki/?s=${encodeURIComponent(query)}`);
    if (!search || search.status !== 200) continue;

    const $ = cheerio.load(search.html);
    const candidates: SearchCandidate[] = [];
    $('.movie-card').each((_, el) => {
      const $el = $(el);
      const dataTitle = $el.attr('data-title');
      const dataYear = $el.attr('data-year');
      const href = $el.find('a').first().attr('href');
      const title = dataTitle || $el.find('.entry-title a').first().text().trim();
      if (!href || !title) return;
      const posterSrc = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
      candidates.push({
        url: href,
        title,
        posterHash: extractPosterHash(posterSrc),
        year: dataYear ? parseInt(dataYear, 10) || null : null,
      });
    });

    const best = pickBestCandidate(candidates, query, params.posterHash, params.year);
    if (best) return best;
  }

  return null;
}

export type FreeSiteKey = 'watchtv' | 'hydraflix' | 'moviedbwiki';

const FREE_SITE_FINDERS: Record<FreeSiteKey, (params: FreeSiteQuery) => Promise<FreeSiteMatch | null>> = {
  watchtv: findOnWatchTv,
  hydraflix: findOnHydraflix,
  moviedbwiki: findOnMoviedbWiki,
};

export async function findFreeWatchLink(
  site: FreeSiteKey,
  params: {
    titreVo: string;
    titreVf?: string | null;
    type: 'film' | 'serie';
    afficheUrl?: string | null;
    anneeSortie?: number | null;
  },
): Promise<FreeSiteMatch | null> {
  return FREE_SITE_FINDERS[site]({
    titreVo: params.titreVo,
    titreVf: params.titreVf,
    type: params.type,
    posterHash: extractPosterHash(params.afficheUrl),
    year: params.anneeSortie ?? null,
  });
}

/**
 * Plateformes de streaming officielles (module "Streaming FR") — vérifiées
 * via TMDB `watch/providers` (données JustWatch) plutôt que des liens
 * devinés à l'aveugle : on ne propose que les plateformes qui ont vraiment
 * le titre pour la région demandée. TMDB ne fournit pas de lien direct par
 * plateforme (Netflix/Disney+/Canal+ n'exposent pas d'API publique pour ça),
 * seulement un lien agrégateur précis (`results[region].link`) — chaque
 * bouton pointe donc vers cette même page, qui liste les vrais liens.
 */

export type AccessType = 'abonnement' | 'location' | 'achat';

export type OfficialProvider = {
  key: 'netflix' | 'prime' | 'canal' | 'disney' | 'appletv';
  name: string;
  accessTypes: AccessType[];
};

const PROVIDER_KEYS: Array<{ key: OfficialProvider['key']; name: string; match: (n: string) => boolean }> = [
  { key: 'netflix', name: 'Netflix', match: (n) => n.includes('netflix') },
  {
    key: 'prime',
    name: 'Prime Video',
    match: (n) => n.includes('prime video') || n.includes('amazon video'),
  },
  { key: 'canal', name: 'Canal+', match: (n) => n.includes('canal+') || n.includes('canal plus') },
  { key: 'disney', name: 'Disney+', match: (n) => n.includes('disney') },
  { key: 'appletv', name: 'Apple TV', match: (n) => n.includes('apple tv') },
];

type TmdbWatchProvidersResponse = {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: Array<{ provider_name: string }>;
      ads?: Array<{ provider_name: string }>;
      free?: Array<{ provider_name: string }>;
      rent?: Array<{ provider_name: string }>;
      buy?: Array<{ provider_name: string }>;
    }
  >;
};

export function extractOfficialProviders(
  data: TmdbWatchProvidersResponse,
  region: string,
): { watchUrl: string | null; providers: OfficialProvider[] } {
  const regionData = data.results?.[region];
  if (!regionData) {
    return { watchUrl: null, providers: [] };
  }

  const accessByProviderName = new Map<string, Set<AccessType>>();
  const addAll = (list: Array<{ provider_name: string }> | undefined, access: AccessType) => {
    for (const entry of list ?? []) {
      const normName = entry.provider_name.toLowerCase();
      if (!accessByProviderName.has(normName)) {
        accessByProviderName.set(normName, new Set());
      }
      accessByProviderName.get(normName)!.add(access);
    }
  };
  addAll(regionData.flatrate, 'abonnement');
  addAll(regionData.ads, 'abonnement');
  addAll(regionData.free, 'abonnement');
  addAll(regionData.rent, 'location');
  addAll(regionData.buy, 'achat');

  const providers: OfficialProvider[] = [];
  for (const { key, name, match } of PROVIDER_KEYS) {
    const accessTypes = new Set<AccessType>();
    for (const [providerName, access] of accessByProviderName) {
      if (match(providerName)) {
        access.forEach((a) => accessTypes.add(a));
      }
    }
    if (accessTypes.size > 0) {
      providers.push({ key, name, accessTypes: [...accessTypes] });
    }
  }

  return {
    watchUrl: providers.length > 0 ? regionData.link ?? null : null,
    providers,
  };
}
