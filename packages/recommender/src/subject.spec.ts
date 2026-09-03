import { tokenizeSynopsis, computeDateProximity } from './subject';

describe('tokenizeSynopsis', () => {
  it('returns an empty set for null/undefined/empty synopsis', () => {
    expect(tokenizeSynopsis(null).size).toBe(0);
    expect(tokenizeSynopsis(undefined).size).toBe(0);
    expect(tokenizeSynopsis('').size).toBe(0);
  });

  it('strips stopwords and short words', () => {
    const tokens = tokenizeSynopsis('Le chat et la souris dans la maison');
    expect(tokens.has('le')).toBe(false);
    expect(tokens.has('et')).toBe(false);
    expect(tokens.has('chat')).toBe(true);
    expect(tokens.has('souris')).toBe(true);
    expect(tokens.has('maison')).toBe(true);
  });

  it('lowercases and strips punctuation', () => {
    const tokens = tokenizeSynopsis('Un DÉTECTIVE, brillant... résout une énigme !');
    expect(tokens.has('détective')).toBe(true);
    expect(tokens.has('brillant')).toBe(true);
    expect(tokens.has('résout')).toBe(true);
    expect(tokens.has('énigme')).toBe(true);
  });

  it('produces overlapping sets for related synopses', () => {
    const a = tokenizeSynopsis('Un policier infiltre un cartel de drogue à Los Angeles');
    const b = tokenizeSynopsis('Un agent infiltre un cartel de drogue au Mexique');
    const intersection = [...a].filter((w) => b.has(w));
    expect(intersection).toEqual(expect.arrayContaining(['infiltre', 'cartel', 'drogue']));
  });
});

describe('computeDateProximity', () => {
  it('returns 1 for the same year', () => {
    expect(computeDateProximity(2020, 2020)).toBe(1);
  });

  it('decays linearly with year difference', () => {
    expect(computeDateProximity(2020, 2010)).toBeCloseTo(0.5);
  });

  it('returns 0 at 20+ years apart', () => {
    expect(computeDateProximity(2020, 2000)).toBe(0);
    expect(computeDateProximity(2020, 1980)).toBe(0);
  });

  it('returns 0 when a year is unknown', () => {
    expect(computeDateProximity(null, 2020)).toBe(0);
    expect(computeDateProximity(2020, null)).toBe(0);
    expect(computeDateProximity(null, null)).toBe(0);
  });
});
