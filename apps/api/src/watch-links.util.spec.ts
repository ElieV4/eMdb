import { slugify, extractPosterHash, isSoftNotFound, pickBestCandidate } from './watch-links.util';

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
