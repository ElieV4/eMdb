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
