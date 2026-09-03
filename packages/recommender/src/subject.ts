/**
 * eMDB Recommender - Approximation du "sujet" d'un titre
 *
 * Pas d'infra NLP/embeddings dans le projet : on approxime la proximité de
 * sujet par une similarité Jaccard sur les mots significatifs du synopsis
 * (stopwords français retirés, mots courts ignorés). Volontairement simple
 * (pas de racinisation/lemmatisation) — sert de signal complémentaire aux
 * genres/casting/réalisateur, pas de source de vérité.
 */

const FRENCH_STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'à', 'a', 'au', 'aux',
  'en', 'dans', 'sur', 'pour', 'par', 'avec', 'sans', 'ce', 'cet', 'cette', 'ces',
  'qui', 'que', 'quoi', 'dont', 'où', 'il', 'elle', 'ils', 'elles', 'on', 'nous',
  'vous', 'je', 'tu', 'se', 'sa', 'son', 'ses', 'leur', 'leurs', 'est', 'sont',
  'être', 'avoir', 'ont', 'a', 'plus', 'très', 'comme', 'mais', 'ou', 'si', 'ne',
  'pas', 'entre', 'vers', 'chez', 'deux', 'trois', 'tout', 'tous', 'toute',
  'toutes', 'quand', 'alors', 'ainsi', 'aussi', 'encore', 'après', 'avant',
  'depuis', 'pendant', 'lui', 'leur', 'y', 'there', 'their', 'this', 'that',
  'with', 'from', 'have', 'has', 'been', 'will', 'when', 'where', 'which',
  'while', 'about', 'into', 'after', 'before', 'over', 'under', 'than', 'then',
  'the', 'and', 'for', 'are', 'was', 'were', 'his', 'her', 'its', 'who', 'whom',
]);

/**
 * Découpe un synopsis en un ensemble de mots significatifs (minuscules,
 * accents conservés, ponctuation retirée, stopwords et mots < 4 lettres
 * exclus). Retourne un Set vide pour un synopsis absent/vide.
 */
export function tokenizeSynopsis(synopsis: string | null | undefined): Set<string> {
  if (!synopsis) return new Set();

  const words = synopsis
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !FRENCH_STOPWORDS.has(w));

  return new Set(words);
}

/**
 * Score de proximité temporelle entre deux années de sortie : 1 si même
 * année, décroissance linéaire jusqu'à 0 à 20 ans d'écart. Retourne 0 si
 * une des deux années est inconnue (ni bonus ni pénalité).
 */
export function computeDateProximity(yearA: number | null, yearB: number | null): number {
  if (yearA === null || yearB === null) return 0;
  const diff = Math.abs(yearA - yearB);
  return Math.max(0, 1 - diff / 20);
}
