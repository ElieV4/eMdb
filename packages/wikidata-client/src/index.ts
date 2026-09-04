const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

interface SparqlBindingValue {
  type: string;
  value: string;
}

interface SparqlResponse {
  results: { bindings: Record<string, SparqlBindingValue>[] };
}

/**
 * Exécute une requête SPARQL contre le point de terminaison public Wikidata
 * et retourne les `bindings` bruts (une ligne par résultat, une clé par
 * variable sélectionnée).
 */
async function sparqlQuery(query: string): Promise<Record<string, SparqlBindingValue>[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'emdb/1.0 (https://github.com/emdb)',
    },
  });

  if (!res.ok) {
    throw new Error(`Requête SPARQL Wikidata échouée ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as SparqlResponse;
  return json.results.bindings;
}

function bindingId(binding: Record<string, SparqlBindingValue>, key: string): string | null {
  const raw = binding[key]?.value;
  if (!raw) return null;
  return raw.split('/').pop() ?? null;
}

function bindingStr(binding: Record<string, SparqlBindingValue>, key: string): string | null {
  return binding[key]?.value ?? null;
}

function bindingNum(binding: Record<string, SparqlBindingValue>, key: string): number | null {
  const raw = binding[key]?.value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export type SelectionKind = 'festival' | 'awards';

export interface AwardCategory {
  qid: string;
  label: string;
}

export interface SelectionSource {
  /** QID racine : le festival lui-même (kind festival) ou la cérémonie de
   * récompenses (kind awards). */
  qid: string;
  nom: string;
  kind: SelectionKind;
  /**
   * Festivals uniquement — QID de la "classe" regroupant toutes les
   * catégories de prix de ce festival (permet de les énumérer
   * automatiquement plutôt que de les curer à la main). Confirmé fiable
   * pour Cannes (Q28444913) ; pas d'équivalent trouvé pour les autres
   * festivals de la liste — absent pour eux, ce qui fait retomber
   * `getEditionSelection` sur une liste plate sans catégorie.
   */
  awardsClassQid?: string;
  /**
   * Cérémonies (kind awards) uniquement — liste curatée à la main des
   * catégories récompensant un FILM ou une SÉRIE (pas les catégories
   * d'interprétation/réalisation, qui récompensent une personne et n'ont
   * donc pas de titre à rattacher).
   */
  categories?: AwardCategory[];
}

/**
 * Festivals de cinéma français et internationaux réputés, + deux cérémonies
 * très connues (Golden Globes, Emmy) demandées explicitement malgré une
 * structure Wikidata plus bruitée pour ces dernières (cf. docs de cadrage).
 */
export const SELECTION_SOURCES: SelectionSource[] = [
  { qid: 'Q42369', nom: 'Festival de Cannes', kind: 'festival', awardsClassQid: 'Q28444913' },
  { qid: 'Q130871', nom: 'Berlinale', kind: 'festival' },
  { qid: 'Q49024', nom: 'Mostra de Venise', kind: 'festival' },
  { qid: 'Q1408657', nom: 'Festival du cinéma américain de Deauville', kind: 'festival' },
  {
    qid: 'Q1408677',
    nom: "Festival international du film d'animation d'Annecy",
    kind: 'festival',
  },
  {
    qid: 'Q568219',
    nom: 'Festival international du film fantastique de Gérardmer',
    kind: 'festival',
  },
  { qid: 'Q3070503', nom: "Festival du film francophone d'Angoulême", kind: 'festival' },
  { qid: 'Q3070709', nom: 'Festival La Rochelle Cinéma', kind: 'festival' },
  { qid: 'Q189887', nom: 'Festival du film de Sundance', kind: 'festival' },
  {
    qid: 'Q1011547',
    nom: 'Golden Globes',
    kind: 'awards',
    categories: [
      { qid: 'Q1011509', label: 'Meilleur film dramatique' },
      { qid: 'Q670282', label: 'Meilleur film musical ou comédie' },
      { qid: 'Q387380', label: 'Meilleur film en langue étrangère' },
      { qid: 'Q878902', label: "Meilleur film d'animation" },
      { qid: 'Q1255198', label: 'Meilleure série télévisée dramatique' },
      { qid: 'Q596294', label: 'Meilleure série télévisée musicale ou comique' },
      { qid: 'Q265435', label: 'Meilleure mini-série ou meilleur téléfilm' },
    ],
  },
  {
    qid: 'Q1044427',
    nom: 'Primetime Emmy Awards',
    kind: 'awards',
    categories: [
      { qid: 'Q989438', label: 'Meilleure série dramatique' },
      { qid: 'Q2110156', label: 'Meilleure série comique' },
      { qid: 'Q20714679', label: 'Meilleure série limitée ou anthologie' },
    ],
  },
];

export interface FestivalEdition {
  sourceQid: string;
  sourceNom: string;
  kind: SelectionKind;
  /** QID réel de l'édition (festivals) ou identifiant synthétique
   * `${sourceQid}-${annee}` (cérémonies, qui n'ont pas d'entité "édition"
   * fiable à énumérer sur Wikidata — cf. docs de cadrage). */
  editionId: string;
  editionLabel: string;
  annee: number;
  /** ISO 8601, `null` pour les cérémonies (on ne connaît que l'année). */
  date: string | null;
}

const FESTIVAL_SOURCES = SELECTION_SOURCES.filter((s) => s.kind === 'festival');
const AWARDS_SOURCES = SELECTION_SOURCES.filter((s) => s.kind === 'awards');

async function getRecentFestivalEditions(): Promise<FestivalEdition[]> {
  if (FESTIVAL_SOURCES.length === 0) return [];

  const values = FESTIVAL_SOURCES.map((s) => `wd:${s.qid}`).join(' ');
  const query = `
    SELECT ?fest ?ed ?edLabel ?date WHERE {
      VALUES ?fest { ${values} }
      ?ed wdt:P179 ?fest .
      ?ed wdt:P585 ?date .
      FILTER(?date <= NOW())
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" }
    }
  `;

  const bindings = await sparqlQuery(query);
  const bySource = new Map<string, FestivalEdition>();

  for (const b of bindings) {
    const festQid = bindingId(b, 'fest');
    const edQid = bindingId(b, 'ed');
    const dateStr = bindingStr(b, 'date');
    const label = bindingStr(b, 'edLabel');
    if (!festQid || !edQid || !dateStr) continue;

    const source = FESTIVAL_SOURCES.find((s) => s.qid === festQid);
    if (!source) continue;

    const existing = bySource.get(festQid);
    if (existing && existing.date && existing.date >= dateStr) continue;

    bySource.set(festQid, {
      sourceQid: festQid,
      sourceNom: source.nom,
      kind: 'festival',
      editionId: edQid,
      editionLabel: label ?? `${source.nom} ${dateStr.slice(0, 4)}`,
      annee: Number(dateStr.slice(0, 4)),
      date: dateStr,
    });
  }

  return [...bySource.values()];
}

async function getMostRecentAwardsYear(source: SelectionSource): Promise<number | null> {
  const categories = source.categories ?? [];
  if (categories.length === 0) return null;

  const values = categories.map((c) => `wd:${c.qid}`).join(' ');
  const currentYear = new Date().getFullYear();
  const query = `
    SELECT DISTINCT ?year WHERE {
      VALUES ?cat { ${values} }
      {
        ?item p:P166 ?st . ?st ps:P166 ?cat . ?st pq:P585 ?d .
      } UNION {
        ?item p:P1411 ?st . ?st ps:P1411 ?cat . ?st pq:P585 ?d .
      }
      BIND(YEAR(?d) AS ?year)
      FILTER(?year <= ${currentYear})
    }
    ORDER BY DESC(?year)
    LIMIT 1
  `;

  const bindings = await sparqlQuery(query);
  const year = bindings[0] ? bindingNum(bindings[0], 'year') : null;
  return year;
}

async function getRecentAwardsEditions(): Promise<FestivalEdition[]> {
  const editions: FestivalEdition[] = [];

  for (const source of AWARDS_SOURCES) {
    const year = await getMostRecentAwardsYear(source);
    if (!year) continue;

    editions.push({
      sourceQid: source.qid,
      sourceNom: source.nom,
      kind: 'awards',
      editionId: `${source.qid}-${year}`,
      editionLabel: `${source.nom} ${year}`,
      annee: year,
      date: null,
    });
  }

  return editions;
}

/**
 * Éditions récentes (une par source, la plus récente déjà passée) des
 * festivals et cérémonies suivis. Résilient : une source qui ne renvoie
 * rien (pas de date connue, service Wikidata en retard) est simplement
 * absente du résultat plutôt que de faire échouer l'appel entier.
 */
export async function getRecentEditions(): Promise<FestivalEdition[]> {
  const [festivals, awards] = await Promise.all([
    getRecentFestivalEditions().catch(() => []),
    getRecentAwardsEditions().catch(() => []),
  ]);

  return [...festivals, ...awards].sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return b.annee - a.annee;
  });
}

export interface FestivalNominee {
  tmdbId: number | null;
  tmdbType: 'film' | 'serie' | null;
  titre: string;
  categorie: string | null;
  gagnant: boolean;
}

function dedupeNominees(rows: FestivalNominee[]): FestivalNominee[] {
  // Un même titre peut apparaître plusieurs fois (plusieurs catégories, ou
  // nommé + gagnant sur la même catégorie) — on garde une entrée par
  // (tmdbId, catégorie), en faisant gagner `gagnant: true` sur `false`.
  const byKey = new Map<string, FestivalNominee>();
  for (const row of rows) {
    const key = `${row.tmdbId ?? row.titre}::${row.categorie ?? ''}`;
    const existing = byKey.get(key);
    if (!existing || (row.gagnant && !existing.gagnant)) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()];
}

async function getFestivalSelection(
  source: SelectionSource,
  editionQid: string,
  annee: number,
): Promise<FestivalNominee[]> {
  const categoryFilter = source.awardsClassQid
    ? `FILTER EXISTS { ?cat wdt:P31 wd:${source.awardsClassQid} }`
    : '';

  const query = `
    SELECT ?film ?filmLabel ?tmdb ?tmdbTv ?cat ?catLabel ?isWinner WHERE {
      ?film wdt:P1344 wd:${editionQid} .
      ?film wdt:P31/wdt:P279* wd:Q11424 .
      OPTIONAL { ?film wdt:P4947 ?tmdb }
      OPTIONAL { ?film wdt:P4983 ?tmdbTv }
      OPTIONAL {
        {
          ?film p:P166 ?st . ?st ps:P166 ?cat .
          ${categoryFilter}
          OPTIONAL { ?st pq:P585 ?d }
          FILTER(!BOUND(?d) || YEAR(?d) = ${annee})
          BIND(true AS ?isWinner)
        } UNION {
          ?film p:P1411 ?st . ?st ps:P1411 ?cat .
          ${categoryFilter}
          OPTIONAL { ?st pq:P585 ?d2 }
          FILTER(!BOUND(?d2) || YEAR(?d2) = ${annee})
          BIND(false AS ?isWinner)
        }
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" }
    }
  `;

  const bindings = await sparqlQuery(query);
  const rows: FestivalNominee[] = [];

  for (const b of bindings) {
    const titre = bindingStr(b, 'filmLabel');
    if (!titre) continue;

    const tmdbMovie = bindingNum(b, 'tmdb');
    const tmdbTv = bindingNum(b, 'tmdbTv');
    const tmdbId = tmdbMovie ?? tmdbTv;
    if (!tmdbId) continue; // pas de correspondance TMDB → rien à afficher/importer

    rows.push({
      tmdbId,
      tmdbType: tmdbMovie ? 'film' : 'serie',
      titre,
      categorie: bindingStr(b, 'catLabel'),
      gagnant: b.isWinner?.value === 'true',
    });
  }

  return dedupeNominees(rows);
}

async function getAwardsSelection(source: SelectionSource, annee: number): Promise<FestivalNominee[]> {
  const categories = source.categories ?? [];
  if (categories.length === 0) return [];

  const values = categories.map((c) => `wd:${c.qid}`).join(' ');
  const query = `
    SELECT ?item ?itemLabel ?tmdb ?tmdbTv ?cat ?catLabel ?isWinner WHERE {
      VALUES ?cat { ${values} }
      {
        ?item p:P166 ?st . ?st ps:P166 ?cat . ?st pq:P585 ?d .
        FILTER(YEAR(?d) = ${annee})
        BIND(true AS ?isWinner)
      } UNION {
        ?item p:P1411 ?st . ?st ps:P1411 ?cat . ?st pq:P585 ?d2 .
        FILTER(YEAR(?d2) = ${annee})
        BIND(false AS ?isWinner)
      }
      OPTIONAL { ?item wdt:P4947 ?tmdb }
      OPTIONAL { ?item wdt:P4983 ?tmdbTv }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" }
    }
  `;

  const bindings = await sparqlQuery(query);
  const rows: FestivalNominee[] = [];

  for (const b of bindings) {
    const titre = bindingStr(b, 'itemLabel');
    if (!titre) continue;

    const tmdbMovie = bindingNum(b, 'tmdb');
    const tmdbTv = bindingNum(b, 'tmdbTv');
    const tmdbId = tmdbMovie ?? tmdbTv;
    if (!tmdbId) continue;

    rows.push({
      tmdbId,
      tmdbType: tmdbMovie ? 'film' : 'serie',
      titre,
      categorie: bindingStr(b, 'catLabel'),
      gagnant: b.isWinner?.value === 'true',
    });
  }

  return dedupeNominees(rows);
}

/**
 * Sélection (nommés + gagnants, avec catégorie quand connue) d'une édition
 * donnée. `editionId` est soit le QID réel d'une édition de festival, soit
 * l'identifiant synthétique `${sourceQid}-${annee}` d'une cérémonie (cf.
 * `FestivalEdition.editionId`).
 */
export async function getEditionSelection(editionId: string): Promise<FestivalNominee[]> {
  const awardsMatch = AWARDS_SOURCES.find((s) => editionId.startsWith(`${s.qid}-`));
  if (awardsMatch) {
    const annee = Number(editionId.slice(awardsMatch.qid.length + 1));
    return getAwardsSelection(awardsMatch, annee);
  }

  // Édition de festival : il faut retrouver son année (P585) et son
  // festival parent (P179, dont dépend `awardsClassQid`) — l'appelant ne
  // fournit que l'id d'édition, donc une requête dédiée les récupère.
  const contextQuery = `SELECT ?date ?fest WHERE { wd:${editionId} wdt:P585 ?date . wd:${editionId} wdt:P179 ?fest . }`;
  const bindings = await sparqlQuery(contextQuery);
  const dateStr = bindings[0] ? bindingStr(bindings[0], 'date') : null;
  const festQid = bindings[0] ? bindingId(bindings[0], 'fest') : null;
  if (!dateStr || !festQid) return [];
  const annee = Number(dateStr.slice(0, 4));

  const parentSource = FESTIVAL_SOURCES.find((s) => s.qid === festQid);
  if (!parentSource) return [];

  return getFestivalSelection(parentSource, editionId, annee);
}

export async function getWikipediaUrlFromWikidataId(
  wikidataId: string,
  lang = 'fr',
): Promise<string | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(
    wikidataId,
  )}&props=sitelinks/urls&format=json&formatversion=2`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 429) {
      return null;
    }
    throw new Error(`Wikidata request failed ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as any;
  const siteLinks = json.entities?.[wikidataId]?.sitelinks;

  if (!siteLinks) {
    return null;
  }

  const siteKey = `${lang}wiki`;
  return siteLinks[siteKey]?.url ?? null;
}
