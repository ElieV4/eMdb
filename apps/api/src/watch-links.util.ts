import * as cheerio from 'cheerio';
import { getMovieExternalIds, getTvExternalIds } from '@emdb/tmdb-client';

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
 * Sites "gratuits" whitelistés — configurables par l'utilisateur (table
 * `free_watch_sites`, cf. FreeWatchSitesService), plus aucun site codé en
 * dur : l'algo doit fonctionner sur un site jamais vu, à partir d'une simple
 * URL de recherche (+ éventuellement une URL devinée et un sélecteur CSS
 * optionnels, cf. `FreeWatchSiteConfig`).
 *
 * Stratégie en deux temps :
 * 1. Si `url_directe` est configurée : essai direct sur l'URL devinée à
 *    partir du titre (rapide) — la page est chargée et son <title> vérifié
 *    (pas de "page not found"/"404", ces sites renvoient parfois un statut
 *    200 sur une page "introuvable" générique). Placeholders disponibles
 *    dans `url_directe` : `{slug}` (titre normalisé), `{type}` ("movie" ou
 *    "series"), `{tmdbId}` (id TMDB, déjà connu, aucun coût), `{imdbId}`
 *    (id IMDB, ex. "tt1375666" — résolu à la demande via TMDB
 *    `external_ids`, un appel de plus, déclenché uniquement si le template
 *    référence effectivement `{imdbId}`). Beaucoup de ces sites
 *    intercalent l'un des deux id dans l'URL (ex.
 *    `https://exemple.com/{type}/{tmdbId}/{slug}`).
 * 2. Sinon (ou si l'essai direct est inconclusif — bloqué/erreur réseau, pas
 *    "confirmé introuvable") : recherche via `url_recherche`, résultats
 *    parsés (cheerio) puis scorés :
 *    - correspondance du hash d'affiche TMDB (nom de fichier de l'image
 *      poster, ex. "jkixsXzRh28q3PCqFoWcf7unghT.jpg") si disponible : signal
 *      fiable à ~100%, ces sites récupèrent souvent leurs affiches
 *      directement depuis image.tmdb.org avec le même hash que notre propre
 *      `affiche_url` ;
 *    - sinon titre + année normalisés.
 *
 * `selecteur_resultat` (optionnel) cible les éléments "carte résultat" sur
 * la page de recherche — sans lui, heuristique générique (tout `<a>`
 * contenant une `<img>`, filtre déjà l'essentiel de la nav/footer). Dans les
 * deux cas, l'extraction à l'intérieur de chaque élément candidat
 * (`extractCandidateFromElement`) reste générique : `data-title`/`data-year`
 * si présents (convention assez répandue), sinon alt de l'image / attribut
 * title du lien / texte du lien — pas de sélecteur par site pour ces
 * sous-champs, volontairement (cf. discussion : la précision par site perd
 * face à la simplicité de configuration ici).
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

/**
 * `trace`, si fourni, accumule une ligne par requête (statut ou erreur
 * réseau) — utilisé uniquement pour le diagnostic (`?debug=1` sur
 * GET /watch-links/free), permet de distinguer "aucun résultat" de "bloqué
 * par le site avant même d'avoir pu chercher" sans accès aux logs Render.
 */
async function fetchHtml(
  url: string,
  trace?: string[],
): Promise<{ status: number; html: string } | null> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });
    trace?.push(`GET ${url} -> ${res.status}`);
    const html = res.ok ? await res.text() : '';
    return { status: res.status, html };
  } catch (error) {
    trace?.push(`GET ${url} -> ERROR ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export function isSoftNotFound(pageTitle: string): boolean {
  return /page not found|404|not found/i.test(pageTitle);
}

export type FreeSiteMatch = {
  url: string;
  matchedBy: 'poster' | 'title-year' | 'title' | 'unverified';
};

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
  tmdbId: number | null;
};

/** IMDB id (ex. "tt1375666") résolu depuis le tmdb_id — certains sites
 * gratuits devinent leurs URLs à partir de l'id IMDB plutôt que TMDB. Appel
 * TMDB supplémentaire, déclenché uniquement quand `url_directe` référence
 * réellement `{imdbId}` (cf. appelant) pour ne pas le payer sur les sites
 * qui n'en ont pas besoin. Erreur réseau/TMDB avalée : `{imdbId}` retombe
 * simplement sur '' dans le template (comportement déjà existant de
 * `resolveTemplate` pour une clé non résolue).
 */
async function resolveImdbId(tmdbId: number, type: 'film' | 'serie'): Promise<string | null> {
  try {
    const data =
      type === 'film' ? await getMovieExternalIds(tmdbId) : await getTvExternalIds(tmdbId);
    return data?.imdb_id ?? null;
  } catch {
    return null;
  }
}

/** Config minimale d'un site whitelisté (table `free_watch_sites`) —
 * `url_directe`/`selecteur_resultat` optionnels, cf. commentaire ci-dessus. */
export type FreeWatchSiteConfig = {
  id: string;
  nom: string;
  url_recherche: string;
  url_directe: string | null;
  selecteur_resultat: string | null;
};

/** Substitution `{cle}` -> valeur dans un template d'URL — aucune clé
 * inconnue dans le template n'est laissée en l'état (remplacée par ''). */
export function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

/**
 * Extraction générique d'un candidat à partir d'un élément "carte résultat"
 * — aucun sélecteur par site pour les sous-champs (href/titre/affiche/
 * année) : `data-title`/`data-year` sur l'élément si présents (convention
 * assez répandue chez ces sites, ex. MovieDB Wiki), sinon alt de l'image /
 * attribut title du lien / texte du lien pour le titre. Pas d'extraction
 * d'année hors `data-year` (trop variable d'un site à l'autre pour un
 * sélecteur générique fiable) — le matching retombe alors sur le hash
 * d'affiche ou le titre seul, cf. `pickBestCandidate`.
 */
export function extractCandidateFromElement(
  $: cheerio.CheerioAPI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  el: any,
  pageUrl: string,
): SearchCandidate | null {
  const $el = $(el);
  const $link = $el.is('a') ? $el : $el.find('a').first();
  const hrefRaw = $link.attr('href')?.split('?')[0];
  if (!hrefRaw) return null;

  let href: string;
  try {
    href = new URL(hrefRaw, pageUrl).toString();
  } catch {
    return null;
  }

  const $img = $el.is('img') ? $el : $el.find('img').first();
  const posterSrc =
    $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original') || $img.attr('src') || '';

  const title =
    $el.attr('data-title')?.trim() ||
    $img.attr('alt')?.trim() ||
    $link.attr('title')?.trim() ||
    $link.text().trim();
  if (!title) return null;

  const yearAttr = $el.attr('data-year');

  return {
    url: href,
    title,
    posterHash: extractPosterHash(posterSrc),
    year: yearAttr ? parseInt(yearAttr, 10) || null : null,
  };
}

/**
 * Certains sites (ex. WatchTV/HydraFlix, avant leur migration vers cette
 * table) renvoient un 403 Cloudflare systématique sur TOUTE requête émise
 * depuis Render (l'IP/ASN du serveur est bloquée avant même que la logique
 * de recherche s'exécute), alors qu'ils répondent normalement à un
 * navigateur classique. Pas de contournement propre côté code (proxy
 * résidentiel = coût + zone grise, hors scope) : si l'essai direct est
 * inconclusif (bloqué/erreur réseau — PAS un "introuvable" confirmé, la
 * page a bien répondu) et que la recherche ne trouve rien non plus, on
 * affiche quand même le lien deviné, non vérifié, plutôt que rien — retour
 * utilisateur : un lien parfois mort vaut mieux qu'un match réel manqué
 * systématiquement.
 */
async function findOnGenericSite(
  site: FreeWatchSiteConfig,
  params: FreeSiteQuery,
  trace?: string[],
): Promise<FreeSiteMatch | null> {
  let directUrl: string | null = null;
  let directConfirmedMissing = false;

  if (site.url_directe) {
    const vars: Record<string, string> = {
      slug: slugify(params.titreVo),
      type: params.type === 'film' ? 'movie' : 'series',
    };
    if (params.tmdbId) vars.tmdbId = String(params.tmdbId);
    if (params.tmdbId && site.url_directe.includes('{imdbId}')) {
      const imdbId = await resolveImdbId(params.tmdbId, params.type);
      if (imdbId) vars.imdbId = imdbId;
    }

    directUrl = resolveTemplate(site.url_directe, vars);
    const direct = await fetchHtml(directUrl, trace);
    if (direct && direct.status === 200) {
      const $ = cheerio.load(direct.html);
      if (!isSoftNotFound($('title').first().text())) {
        return { url: directUrl, matchedBy: 'title' };
      }
      directConfirmedMissing = true;
    }
  }

  const queries = params.titreVf && params.titreVf !== params.titreVo
    ? [params.titreVo, params.titreVf]
    : [params.titreVo];

  for (const query of queries) {
    const searchUrl = resolveTemplate(site.url_recherche, { query: encodeURIComponent(query) });
    const search = await fetchHtml(searchUrl, trace);
    if (!search || search.status !== 200) continue;

    const $ = cheerio.load(search.html);
    const resultSelector = site.selecteur_resultat || 'a:has(img)';
    const candidates: SearchCandidate[] = [];
    $(resultSelector).each((_, el) => {
      const candidate = extractCandidateFromElement($, el, searchUrl);
      if (candidate) candidates.push(candidate);
    });

    const best = pickBestCandidate(candidates, query, params.posterHash, params.year);
    if (best) return best;
  }

  if (directUrl && !directConfirmedMissing) {
    return { url: directUrl, matchedBy: 'unverified' };
  }
  return null;
}

export async function findFreeWatchLink(
  site: FreeWatchSiteConfig,
  params: {
    titreVo: string;
    titreVf?: string | null;
    type: 'film' | 'serie';
    afficheUrl?: string | null;
    anneeSortie?: number | null;
    tmdbId?: number | null;
  },
  trace?: string[],
): Promise<FreeSiteMatch | null> {
  return findOnGenericSite(
    site,
    {
      titreVo: params.titreVo,
      titreVf: params.titreVf,
      type: params.type,
      posterHash: extractPosterHash(params.afficheUrl),
      year: params.anneeSortie ?? null,
      tmdbId: params.tmdbId ?? null,
    },
    trace,
  );
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
