import {
  getWikipediaUrlFromWikidataId,
  getGenderFromWikidataId,
  getRecentEditions,
  getEditionSelection,
} from './index';

describe('wikidata-client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('getWikipediaUrlFromWikidataId', () => {
    beforeEach(() => {
      globalThis.fetch = jest.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              entities: {
                Q12345: {
                  sitelinks: {
                    frwiki: { url: 'https://fr.wikipedia.org/wiki/Test' },
                  },
                },
              },
            }),
          }) as any,
      );
    });

    it('doit retourner l URL Wikipedia pour un wikidataId', async () => {
      const url = await getWikipediaUrlFromWikidataId('Q12345', 'fr');
      expect(url).toBe('https://fr.wikipedia.org/wiki/Test');
    });
  });

  describe('getGenderFromWikidataId', () => {
    function mockClaims(gender: { id: string } | null) {
      globalThis.fetch = jest.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              entities: {
                Q999: {
                  claims: gender ? { P21: [{ mainsnak: { datavalue: { value: { id: gender.id } } } }] } : {},
                },
              },
            }),
          }) as any,
      );
    }

    it('mappe Q6581072 (femme cisgenre) sur "femme"', async () => {
      mockClaims({ id: 'Q6581072' });
      expect(await getGenderFromWikidataId('Q999')).toBe('femme');
    });

    it('mappe Q6581097 (homme cisgenre) sur "homme"', async () => {
      mockClaims({ id: 'Q6581097' });
      expect(await getGenderFromWikidataId('Q999')).toBe('homme');
    });

    it('mappe Q48270 (non-binaire) sur "autre"', async () => {
      mockClaims({ id: 'Q48270' });
      expect(await getGenderFromWikidataId('Q999')).toBe('autre');
    });

    it('retourne null si P21 absent', async () => {
      mockClaims(null);
      expect(await getGenderFromWikidataId('Q999')).toBeNull();
    });

    it('retourne null pour un QID non reconnu plutôt que de mal classer', async () => {
      mockClaims({ id: 'Q99999999' });
      expect(await getGenderFromWikidataId('Q999')).toBeNull();
    });

    it('retourne null (pas d’exception) sur un 429', async () => {
      globalThis.fetch = jest.fn(async () => ({ ok: false, status: 429 }) as any);
      expect(await getGenderFromWikidataId('Q999')).toBeNull();
    });
  });

  function mockSparql(routes: { match: (query: string) => boolean; bindings: Record<string, any>[] }[]) {
    globalThis.fetch = jest.fn(async (url: any) => {
      const decoded = decodeURIComponent(String(url));
      const route = routes.find((r) => r.match(decoded));
      return {
        ok: true,
        json: async () => ({ results: { bindings: route?.bindings ?? [] } }),
      } as any;
    });
  }

  function uri(qid: string) {
    return { type: 'uri', value: `http://www.wikidata.org/entity/${qid}` };
  }
  function lit(value: string) {
    return { type: 'literal', value };
  }

  describe('getRecentEditions', () => {
    it('fusionne les éditions de festivals et cérémonies, triées par date/année décroissante', async () => {
      mockSparql([
        {
          match: (q) => q.includes('VALUES ?fest'),
          bindings: [
            {
              fest: uri('Q42369'),
              ed: uri('Q138481168'),
              edLabel: lit('Festival de Cannes 2026'),
              date: lit('2026-05-01T00:00:00Z'),
            },
          ],
        },
        {
          // Golden Globes → année la plus récente
          match: (q) => q.includes('VALUES ?cat') && q.includes('Q1011509'),
          bindings: [{ year: lit('2026') }],
        },
        {
          // Emmy → année la plus récente
          match: (q) => q.includes('VALUES ?cat') && q.includes('Q989438'),
          bindings: [{ year: lit('2025') }],
        },
      ]);

      const editions = await getRecentEditions();

      expect(editions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sourceQid: 'Q42369', editionId: 'Q138481168', annee: 2026 }),
          expect.objectContaining({ sourceQid: 'Q1011547', editionId: 'Q1011547-2026', annee: 2026 }),
          expect.objectContaining({ sourceQid: 'Q1044427', editionId: 'Q1044427-2025', annee: 2025 }),
        ]),
      );
      // Une source sans réponse (ex. La Rochelle) est absente, pas une erreur.
      expect(editions.find((e) => e.sourceQid === 'Q3070709')).toBeUndefined();
    });
  });

  describe('getEditionSelection', () => {
    it('récupère la sélection d une édition de festival, avec catégorie/gagnant quand connus', async () => {
      mockSparql([
        {
          match: (q) => q.includes('wdt:P585 ?date') && q.includes('wdt:P179 ?fest'),
          bindings: [{ date: lit('2022-05-17T00:00:00Z'), fest: uri('Q42369') }],
        },
        {
          match: (q) => q.includes('wdt:P1344'),
          bindings: [
            {
              film: uri('Q803700'),
              filmLabel: lit('Les Huit Montagnes'),
              tmdb: lit('803700'),
              cat: uri('Q179808'),
              catLabel: lit("Palme d'or"),
              isWinner: lit('false'),
            },
            {
              film: uri('Q958192'),
              filmLabel: lit('Alma Viva'),
              tmdb: lit('958192'),
              // pas de catégorie pour ce film → sélection officielle simple
            },
          ],
        },
      ]);

      const nominees = await getEditionSelection('Q107526152');

      expect(nominees).toEqual([
        expect.objectContaining({
          tmdbId: 803700,
          tmdbType: 'film',
          titre: 'Les Huit Montagnes',
          categorie: "Palme d'or",
          gagnant: false,
        }),
        expect.objectContaining({ tmdbId: 958192, titre: 'Alma Viva', categorie: null, gagnant: false }),
      ]);
    });

    it('récupère la sélection d une cérémonie (édition synthétique)', async () => {
      mockSparql([
        {
          match: (q) => q.includes('VALUES ?cat'),
          bindings: [
            {
              item: uri('Q117037697'),
              itemLabel: lit('Anatomy of a Fall'),
              tmdb: lit('467244'),
              cat: uri('Q1011509'),
              catLabel: lit('Meilleur film dramatique'),
              isWinner: lit('true'),
            },
          ],
        },
      ]);

      const nominees = await getEditionSelection('Q1011547-2024');

      expect(nominees).toEqual([
        expect.objectContaining({
          tmdbId: 467244,
          tmdbType: 'film',
          titre: 'Anatomy of a Fall',
          categorie: 'Meilleur film dramatique',
          gagnant: true,
        }),
      ]);
    });

    it('ignore les entrées sans id TMDB (rien à afficher/importer)', async () => {
      mockSparql([
        {
          match: (q) => q.includes('VALUES ?cat'),
          bindings: [
            { item: uri('Q1'), itemLabel: lit('Sans TMDB'), cat: uri('Q1011509'), isWinner: lit('true') },
          ],
        },
      ]);

      const nominees = await getEditionSelection('Q1011547-2024');
      expect(nominees).toEqual([]);
    });
  });
});
