import * as cheerio from 'cheerio';
import {
  slugify,
  extractPosterHash,
  isSoftNotFound,
  pickBestCandidate,
  resolveTemplate,
  extractCandidateFromElement,
  findFreeWatchLink,
  FreeWatchSiteConfig,
} from './watch-links.util';

describe('slugify', () => {
  it("retire l'apostrophe sans la remplacer par un tiret", () => {
    expect(slugify("Pan's Labyrinth")).toBe('pans-labyrinth');
  });

  it("gère l'apostrophe typographique (’)", () => {
    expect(slugify('Grey’s Anatomy')).toBe('greys-anatomy');
  });

  it('remplace les deux-points et espaces par un tiret', () => {
    expect(slugify('Spider-Man: Far From Home')).toBe('spider-man-far-from-home');
  });

  it('conserve le comportement pour un titre simple', () => {
    expect(slugify('Psycho')).toBe('psycho');
  });
});

describe('extractPosterHash', () => {
  it('extrait le hash de fichier TMDB indépendamment de la taille demandée', () => {
    expect(extractPosterHash('https://image.tmdb.org/t/p/w185/jkixsXzRh28q3PCqFoWcf7unghT.jpg')).toBe(
      'jkixsXzRh28q3PCqFoWcf7unghT.jpg',
    );
    expect(
      extractPosterHash('https://image.tmdb.org/t/p/w600_and_h900_bestv2/jkixsXzRh28q3PCqFoWcf7unghT.jpg'),
    ).toBe('jkixsXzRh28q3PCqFoWcf7unghT.jpg');
  });

  it('retourne null pour une URL vide ou sans image', () => {
    expect(extractPosterHash(null)).toBeNull();
    expect(extractPosterHash(undefined)).toBeNull();
    expect(extractPosterHash('https://example.com/no-image-here')).toBeNull();
  });
});

describe('isSoftNotFound', () => {
  it('détecte les titres de page "introuvable" malgré un statut 200', () => {
    expect(isSoftNotFound('Page not found - Watch TV')).toBe(true);
    expect(isSoftNotFound('Page not found – HydraFlix')).toBe(true);
    expect(isSoftNotFound('Page not found - Full Movie DB')).toBe(true);
  });

  it('ne détecte pas un vrai titre de film', () => {
    expect(isSoftNotFound('Watch Psycho movie Free Online on Watch TV')).toBe(false);
    expect(isSoftNotFound('Kinds of Kindness – HydraFlix')).toBe(false);
  });
});

describe('pickBestCandidate', () => {
  const candidates = [
    { url: 'https://site/the-hunt-prey/', title: 'The Hunt: Prey vs Predator', posterHash: 'aaa.jpg', year: 2022 },
    { url: 'https://site/the-hunt/', title: 'The Hunt', posterHash: 'jkixsXzRh28q3PCqFoWcf7unghT.jpg', year: 2012 },
    { url: 'https://site/after-the-hunt/', title: 'After the Hunt', posterHash: 'bbb.jpg', year: 2025 },
  ];

  it('priorise la correspondance exacte du hash d’affiche sur le titre', () => {
    const result = pickBestCandidate(candidates, 'The Hunt', 'jkixsXzRh28q3PCqFoWcf7unghT.jpg', 2012);
    expect(result).toEqual({ url: 'https://site/the-hunt/', matchedBy: 'poster' });
  });

  it('retombe sur titre + année si aucun hash ne correspond', () => {
    const result = pickBestCandidate(candidates, 'The Hunt', null, 2012);
    expect(result).toEqual({ url: 'https://site/the-hunt/', matchedBy: 'title-year' });
  });

  it('ignore les titres approchants (Prey vs Predator, After the Hunt)', () => {
    const result = pickBestCandidate(candidates, 'The Hunt', 'unknown-hash.jpg', 2012);
    expect(result?.url).toBe('https://site/the-hunt/');
  });

  it("retourne null si aucun candidat ne correspond", () => {
    const result = pickBestCandidate(candidates, 'A Completely Different Movie', null, 1999);
    expect(result).toBeNull();
  });

  it("rejette un titre correspondant mais avec une année trop éloignée", () => {
    const result = pickBestCandidate(
      [{ url: 'https://site/the-hunt-2020/', title: 'The Hunt', posterHash: null, year: 2020 }],
      'The Hunt',
      null,
      2012,
    );
    expect(result).toBeNull();
  });
});

describe('resolveTemplate', () => {
  it('remplace chaque clé par sa valeur', () => {
    expect(resolveTemplate('https://site/?s={query}', { query: 'inception' })).toBe(
      'https://site/?s=inception',
    );
    expect(resolveTemplate('https://site/{type}/{slug}/', { type: 'movie', slug: 'inception' })).toBe(
      'https://site/movie/inception/',
    );
  });

  it('remplace une clé inconnue par une chaîne vide plutôt que de la laisser telle quelle', () => {
    expect(resolveTemplate('https://site/{inconnu}/', {})).toBe('https://site//');
  });
});

describe('extractCandidateFromElement', () => {
  it('extrait via data-title/data-year sur le conteneur (convention MovieDB Wiki)', () => {
    const $ = cheerio.load(
      '<div class="movie-card" data-title="Inception" data-year="2010"><a href="/movies/inception/"><img src="https://image.tmdb.org/t/p/w500/jkixsXzRh28q3PCqFoWcf7unghT.jpg" /></a></div>',
    );
    const el = $('.movie-card').get(0);
    const candidate = extractCandidateFromElement($, el, 'https://www.moviedb.wiki/?s=inception');
    expect(candidate).toEqual({
      url: 'https://www.moviedb.wiki/movies/inception/',
      title: 'Inception',
      posterHash: 'jkixsXzRh28q3PCqFoWcf7unghT.jpg',
      year: 2010,
    });
  });

  it("retombe sur l'alt de l'image puis le texte du lien quand data-title est absent", () => {
    const $ = cheerio.load('<a href="/inception/" title="Fiche Inception"><img alt="Inception" src="" /></a>');
    const el = $('a').get(0);
    const candidate = extractCandidateFromElement($, el, 'https://site/');
    expect(candidate?.title).toBe('Inception');
  });

  it('résout une URL relative en absolue via la page de base', () => {
    const $ = cheerio.load('<a href="/inception/" title="Inception"><img src="" /></a>');
    const el = $('a').get(0);
    const candidate = extractCandidateFromElement($, el, 'https://www.example.com/?s=inception');
    expect(candidate?.url).toBe('https://www.example.com/inception/');
  });

  it('retourne null sans href ni titre exploitable', () => {
    const $ = cheerio.load('<div class="ad"><img src="" /></div>');
    const el = $('.ad').get(0);
    expect(extractCandidateFromElement($, el, 'https://site/')).toBeNull();
  });
});

describe('findFreeWatchLink (algo générique sur un site configuré)', () => {
  const baseSite: FreeWatchSiteConfig = {
    id: 'site-1',
    nom: 'Exemple',
    url_recherche: 'https://exemple.com/?s={query}',
    url_directe: 'https://exemple.com/{type}/{slug}/',
    selecteur_resultat: null,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('confirme via URL directe quand la page trouvée a bien un <title> valide', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html><head><title>Inception - Exemple</title></head></html>',
    }) as unknown as typeof fetch;

    const match = await findFreeWatchLink(baseSite, { titreVo: 'Inception', type: 'film' });
    expect(match).toEqual({ url: 'https://exemple.com/movie/inception/', matchedBy: 'title' });
  });

  it("retombe sur la recherche (générique, sans selecteur_resultat) quand l'URL directe est un 404 doux confirmé", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/movie/inception/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '<html><head><title>Page not found - Exemple</title></head></html>',
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        // Sélecteur générique (`a:has(img)`, pas de selecteur_resultat) : le
        // `<a>` lui-même est l'élément matché, le hash d'affiche (site-
        // agnostique) porte le signal — pas besoin de data-title/data-year.
        text: async () =>
          '<a href="/inception-2010/"><img alt="Inception" src="https://image.tmdb.org/t/p/w500/jkixsXzRh28q3PCqFoWcf7unghT.jpg"/></a>',
      });
    }) as unknown as typeof fetch;

    const match = await findFreeWatchLink(
      baseSite,
      { titreVo: 'Inception', type: 'film', afficheUrl: 'https://image.tmdb.org/t/p/w185/jkixsXzRh28q3PCqFoWcf7unghT.jpg' },
    );
    expect(match).toEqual({ url: 'https://exemple.com/inception-2010/', matchedBy: 'poster' });
  });

  it("retourne un lien deviné non vérifié si tout est bloqué/inconclusif (jamais un 404 confirmé)", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('blocked')) as unknown as typeof fetch;

    const match = await findFreeWatchLink(baseSite, { titreVo: 'Inception', type: 'film' });
    expect(match).toEqual({ url: 'https://exemple.com/movie/inception/', matchedBy: 'unverified' });
  });

  it('ne retombe jamais sur "unverified" quand le 404 est confirmé et sans url_directe (site type MovieDB Wiki)', async () => {
    const siteWithoutDirect: FreeWatchSiteConfig = { ...baseSite, url_directe: null };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<div>Aucun résultat</div>',
    }) as unknown as typeof fetch;

    const match = await findFreeWatchLink(siteWithoutDirect, { titreVo: 'Inception', type: 'film' });
    expect(match).toBeNull();
  });
});
