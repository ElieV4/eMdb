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
