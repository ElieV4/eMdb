/**
 * eMDB Recommender - Main Recommendation Algorithm
 * Phase 5.1: Algorithme de similarité pour titres et personnes
 *
 * Implémente la similarité pondérée entre titres :
 * - Genres partagés : poids 0.35
 * - Acteurs partagés (top 10) : poids 0.25
 * - Réalisateurs partagés : poids 0.10
 * - Sujet (mots-clés du synopsis) : poids 0.20
 * - Proximité de date de sortie : poids 0.10
 *
 * 2026-09-03 : réécrit pour tenir dans la limite mémoire de l'instance
 * Render (512 Mo) — l'ancienne version (double PrismaClient dédié +
 * O(N²) sans index + chargement de tous les crédits, tous rôles
 * confondus) faisait OOM-crasher le worker en boucle. Voir
 * apps/worker/src/cron.ts pour le contexte de l'incident.
 */

import { prisma } from '@emdb/db';
import { jaccardSimilarity, hasCommonGenre } from './jaccard';
import { tokenizeSynopsis, computeDateProximity } from './subject';

// Type pour les crédits indexés par titre
type TitleCredits = {
  actors: Set<string>;
  directors: Set<string>;
};

// Métadonnées d'un titre utilisées pour le scoring
type TitleMeta = {
  genres: Set<string>;
  releaseYear: number | null;
  subjectTokens: Set<string>;
};

// Type pour les données personne
type PersonData = {
  titles: Set<string>;
  genre: string | null;
};

// Type pour les recommandations
type TitleRecommendation = {
  title_id: string;
  recommended_id: string;
  score: number;
};

type PersonRecommendation = {
  person_id: string;
  recommended_id: string;
  score: number;
};

/**
 * Calcule le score de similarité pondéré entre deux titres
 */
function computeTitleScore(
  metaA: TitleMeta,
  metaB: TitleMeta,
  creditsA: TitleCredits,
  creditsB: TitleCredits,
): number {
  const genreScore = jaccardSimilarity(metaA.genres, metaB.genres) * 0.35;
  const actorScore = jaccardSimilarity(creditsA.actors, creditsB.actors) * 0.25;
  const directorScore = jaccardSimilarity(creditsA.directors, creditsB.directors) * 0.1;
  const subjectScore = jaccardSimilarity(metaA.subjectTokens, metaB.subjectTokens) * 0.2;
  const dateScore = computeDateProximity(metaA.releaseYear, metaB.releaseYear) * 0.1;
  return genreScore + actorScore + directorScore + subjectScore + dateScore;
}

/**
 * Charge les métadonnées (genres, année de sortie, mots-clés du synopsis)
 * de tous les titres en une seule requête.
 *
 * @returns Map title_id -> TitleMeta
 */
async function loadTitlesMeta(): Promise<Map<string, TitleMeta>> {
  const titles = await prisma.titles.findMany({
    select: {
      id: true,
      date_sortie: true,
      synopsis: true,
      title_genres: { select: { genre_id: true } },
    },
  });

  const titlesMeta = new Map<string, TitleMeta>();
  for (const t of titles) {
    titlesMeta.set(t.id, {
      genres: new Set(t.title_genres.map((tg) => tg.genre_id)),
      releaseYear: t.date_sortie ? t.date_sortie.getFullYear() : null,
      subjectTokens: tokenizeSynopsis(t.synopsis),
    });
  }

  return titlesMeta;
}

/**
 * Charge les crédits acteurs (top 10 par ordre de billing, au niveau BDD)
 * et réalisateurs pour tous les titres. Restreint aux deux rôles utiles au
 * scoring — évite de charger en mémoire tout le reste du casting/équipe
 * technique (scénaristes, producteurs, etc.), non utilisé ici.
 *
 * @returns Map title_id -> { actors, directors }
 */
async function loadTitleCredits(): Promise<Map<string, TitleCredits>> {
  const [actorRows, directorRows] = await Promise.all([
    prisma.$queryRaw<{ title_id: string; person_id: string }[]>`
      SELECT title_id, person_id FROM (
        SELECT c.title_id, c.person_id,
               ROW_NUMBER() OVER (PARTITION BY c.title_id ORDER BY c.ordre ASC NULLS LAST) AS rn
        FROM credits c
        JOIN roles r ON r.id = c.role_id
        WHERE c.episode_id IS NULL AND r.code = 'acteur'
      ) ranked
      WHERE rn <= 10
    `,
    prisma.$queryRaw<{ title_id: string; person_id: string }[]>`
      SELECT c.title_id, c.person_id
      FROM credits c
      JOIN roles r ON r.id = c.role_id
      WHERE c.episode_id IS NULL AND r.code = 'realisateur'
    `,
  ]);

  const titleCredits = new Map<string, TitleCredits>();
  const ensure = (titleId: string): TitleCredits => {
    let entry = titleCredits.get(titleId);
    if (!entry) {
      entry = { actors: new Set(), directors: new Set() };
      titleCredits.set(titleId, entry);
    }
    return entry;
  };

  for (const row of actorRows) ensure(row.title_id).actors.add(row.person_id);
  for (const row of directorRows) ensure(row.title_id).directors.add(row.person_id);

  return titleCredits;
}

/**
 * Index inversé genre -> titres, pour générer les candidats d'un titre en
 * O(1) au lieu de scanner tout le catalogue (l'ancienne version testait
 * `hasCommonGenre` contre TOUS les autres titres pour chaque titre, un
 * O(N²) même quand la quasi-totalité des paires n'avait aucun genre en
 * commun).
 */
function buildGenreIndex(titlesMeta: Map<string, TitleMeta>): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const [titleId, meta] of titlesMeta) {
    for (const genreId of meta.genres) {
      let bucket = index.get(genreId);
      if (!bucket) {
        bucket = new Set();
        index.set(genreId, bucket);
      }
      bucket.add(titleId);
    }
  }
  return index;
}

/**
 * Candidats d'un titre : union des titres partageant au moins un genre.
 * Reste le filtre principal de candidats (comme avant) pour garder
 * l'algorithme tractable sur tout le catalogue — les signaux casting/sujet/
 * date affinent le score parmi ces candidats mais ne servent pas seuls à
 * élargir la recherche à tout le catalogue.
 */
function getCandidateIds(
  titleId: string,
  meta: TitleMeta,
  genreIndex: Map<string, Set<string>>,
): Set<string> {
  const candidates = new Set<string>();
  for (const genreId of meta.genres) {
    const bucket = genreIndex.get(genreId);
    if (!bucket) continue;
    for (const id of bucket) {
      if (id !== titleId) candidates.add(id);
    }
  }
  return candidates;
}

/**
 * Calcule les recommandations de titres similaires pour tous les titres
 * Utilise un traitement par batch pour éviter les problèmes de mémoire
 *
 * @param batchSize - Taille du batch (par défaut 100)
 * @returns Nombre total de recommandations insérées
 */
export async function computeTitleRecommendations(batchSize: number = 100): Promise<number> {
  const titlesMeta = await loadTitlesMeta();
  const titleCredits = await loadTitleCredits();
  const genreIndex = buildGenreIndex(titlesMeta);

  const allTitleIds = Array.from(titlesMeta.keys());
  const emptyCredits: TitleCredits = { actors: new Set(), directors: new Set() };
  let totalInserted = 0;

  for (let i = 0; i < allTitleIds.length; i += batchSize) {
    const batch = allTitleIds.slice(i, i + batchSize);
    const records: TitleRecommendation[] = [];

    for (const titleIdA of batch) {
      const metaA = titlesMeta.get(titleIdA)!;
      const creditsA = titleCredits.get(titleIdA) ?? emptyCredits;
      const candidateIds = getCandidateIds(titleIdA, metaA, genreIndex);

      const candidates: Array<{ id: string; score: number }> = [];
      for (const titleIdB of candidateIds) {
        const metaB = titlesMeta.get(titleIdB)!;
        const creditsB = titleCredits.get(titleIdB) ?? emptyCredits;
        const score = computeTitleScore(metaA, metaB, creditsA, creditsB);
        if (score > 0) {
          candidates.push({ id: titleIdB, score });
        }
      }

      // Top 10
      candidates.sort((a, b) => b.score - a.score);
      const top10 = candidates.slice(0, 10);

      for (const c of top10) {
        records.push({ title_id: titleIdA, recommended_id: c.id, score: c.score });
      }
    }

    // Transaction : DELETE anciennes + INSERT nouvelles
    if (records.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Supprimer les anciennes recommandations pour les titres du batch
        await tx.title_recommendations.deleteMany({
          where: { title_id: { in: batch } },
        });

        // Insérer les nouvelles
        await tx.title_recommendations.createMany({
          data: records,
          skipDuplicates: false,
        });
      });
    }

    totalInserted += records.length;
    console.log(
      `[batch ${i / batchSize + 1}] ${batch.length} titles processed, ${records.length} recs`,
    );
  }

  return totalInserted;
}

/**
 * Charge les crédits groupés par personne depuis la base de données
 *
 * @returns Map person_id -> { titles: Set<title_id>, genre: string | null }
 */
async function loadPersonData(): Promise<Map<string, PersonData>> {
  const credits = await prisma.credits.findMany({
    where: { episode_id: null },
    select: {
      person_id: true,
      title_id: true,
      people: { select: { genre: true } },
    },
  });

  const personData = new Map<string, PersonData>();
  for (const c of credits) {
    if (!personData.has(c.person_id)) {
      personData.set(c.person_id, {
        titles: new Set(),
        genre: c.people?.genre ?? null,
      });
    }
    personData.get(c.person_id)!.titles.add(c.title_id);
  }

  return personData;
}

/**
 * Calcule les recommandations de personnes similaires pour toutes les personnes
 *
 * @returns Nombre total de recommandations insérées
 */
export async function computePersonRecommendations(): Promise<number> {
  const personData = await loadPersonData();

  const personIds = Array.from(personData.keys());
  const records: PersonRecommendation[] = [];

  for (let i = 0; i < personIds.length; i++) {
    const pA = personIds[i];
    const dataA = personData.get(pA)!;
    const candidates: Array<{ id: string; score: number }> = [];

    for (let j = i + 1; j < personIds.length; j++) {
      const pB = personIds[j];
      const dataB = personData.get(pB)!;

      const jaccard = jaccardSimilarity(dataA.titles, dataB.titles);
      let score = jaccard;

      // Bonus genre : +0.1 si même genre
      if (dataA.genre && dataB.genre && dataA.genre === dataB.genre) {
        score += 0.1;
      }

      if (score > 0) {
        candidates.push({ id: pB, score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const top10 = candidates.slice(0, 10);

    for (const c of top10) {
      // Symétrique : si A recommande B, alors B recommande A
      records.push({ person_id: pA, recommended_id: c.id, score: c.score });
      records.push({ person_id: c.id, recommended_id: pA, score: c.score });
    }
  }

  // Pas de transaction interactive englobante ici (contrairement aux
  // recommandations de titres, traitées par petits batches) : un delete +
  // insert massif en une seule transaction interactive dépasse le timeout
  // Prisma par défaut (5s) dès que le catalogue de personnes grossit, ce
  // qui fait échouer tout le job. On enchaîne à la place un DELETE rapide
  // (quasi instantané, même sur beaucoup de lignes) puis des INSERT par
  // paquets, chacun sous son propre timeout de requête.
  if (records.length > 0) {
    await prisma.person_recommendations.deleteMany({});
    const insertBatchSize = 1000;
    for (let i = 0; i < records.length; i += insertBatchSize) {
      await prisma.person_recommendations.createMany({
        data: records.slice(i, i + insertBatchSize),
      });
    }
  }

  return records.length;
}

/**
 * Calcule toutes les recommandations (titres + personnes)
 *
 * @param batchSize - Taille du batch pour les titres
 * @returns Statistiques { titlesComputed: number, peopleComputed: number }
 */
export async function computeAllRecommendations(batchSize: number = 100): Promise<{
  titlesComputed: number;
  peopleComputed: number;
}> {
  console.log('Starting title recommendations computation...');
  const titlesComputed = await computeTitleRecommendations(batchSize);
  console.log(`Title recommendations: ${titlesComputed} inserted`);

  console.log('Starting person recommendations computation...');
  const peopleComputed = await computePersonRecommendations();
  console.log(`Person recommendations: ${peopleComputed} inserted`);

  return { titlesComputed, peopleComputed };
}

/**
 * Calcule les recommandations pour un seul titre (utile en dev)
 *
 * @param titleId - ID du titre à analyser
 * @returns Tableau des recommandations pour ce titre
 */
export async function computeRecommendationsForTitle(
  titleId: string,
): Promise<TitleRecommendation[]> {
  const titlesMeta = await loadTitlesMeta();
  const titleCredits = await loadTitleCredits();
  const genreIndex = buildGenreIndex(titlesMeta);
  const emptyCredits: TitleCredits = { actors: new Set(), directors: new Set() };

  const metaA = titlesMeta.get(titleId);
  if (!metaA) {
    console.warn(`Title ${titleId} not found in database`);
    return [];
  }
  const creditsA = titleCredits.get(titleId) ?? emptyCredits;
  const candidateIds = getCandidateIds(titleId, metaA, genreIndex);

  const candidates: Array<{ id: string; score: number }> = [];
  for (const titleIdB of candidateIds) {
    const metaB = titlesMeta.get(titleIdB)!;
    const creditsB = titleCredits.get(titleIdB) ?? emptyCredits;
    const score = computeTitleScore(metaA, metaB, creditsA, creditsB);
    if (score > 0) {
      candidates.push({ id: titleIdB, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const top10 = candidates.slice(0, 10);

  return top10.map((c) => ({
    title_id: titleId,
    recommended_id: c.id,
    score: c.score,
  }));
}

export { jaccardSimilarity, hasCommonGenre };
