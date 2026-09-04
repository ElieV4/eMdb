/**
 * Seed du compte de démo `test@test` (mdp `test`), utilisé pour permettre
 * aux visiteurs du portfolio de tester l'app sans passer par la validation
 * manuelle des inscriptions (cf. lien "Essayer avec un compte de démo" sur
 * /register → /login?demo=1, et auth.service.ts pour le flux d'approbation).
 *
 * Peuple le compte avec des données réalistes copiées aléatoirement du
 * compte réel de l'admin (ELIE_EMAIL) : titres vus/notés, watchlist,
 * personnes/studios/séries suivis.
 *
 * Idempotent : relancer le script réinitialise les données dérivées du
 * compte test (watches/ratings/list_items/follows) sur un nouveau tirage
 * aléatoire, sans toucher au compte source (admin) ni recréer le compte
 * test s'il existe déjà.
 *
 * Usage : npm run seed:test-account --workspace=packages/db
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ELIE_EMAIL = 'elie.vincent4@gmail.com';
const TEST_EMAIL = 'test@test.com'; // 'test@test' rejeté par @IsEmail() (pas de TLD)
const TEST_PSEUDO = 'test';
const TEST_PASSWORD = 'test';

const TARGET_WATCHED = 100;
const TARGET_WATCHLIST = 18;
const TARGET_FOLLOWED_PEOPLE = 15;
const TARGET_FOLLOWED_STUDIOS = 10;
const TARGET_FOLLOWED_SERIES = 5;
const RATING_RATE = 0.6; // proportion des titres "vus" qui reçoivent aussi une note

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomPastDate(maxDaysAgo: number): Date {
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function randomNote(): number {
  // Notes en pas de 0.5, entre 5.0 et 9.5.
  const steps = Math.floor(Math.random() * 10); // 0..9
  return 5 + steps * 0.5;
}

async function main() {
  const elie = await prisma.users.findUnique({ where: { email: ELIE_EMAIL } });
  if (!elie) {
    throw new Error(`Compte source introuvable : ${ELIE_EMAIL}`);
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const testUser = await prisma.users.upsert({
    where: { email: TEST_EMAIL },
    update: { status: 'active' },
    create: {
      email: TEST_EMAIL,
      pseudo: TEST_PSEUDO,
      password_hash: passwordHash,
      status: 'active',
    },
  });
  console.log(`Compte test: ${testUser.id} (${testUser.email})`);

  // Réinitialise les données dérivées pour repartir sur un tirage propre.
  await prisma.$transaction([
    prisma.user_watches.deleteMany({ where: { user_id: testUser.id } }),
    prisma.user_ratings.deleteMany({ where: { user_id: testUser.id } }),
    prisma.user_follows_serie.deleteMany({ where: { user_id: testUser.id } }),
    prisma.user_follows_person.deleteMany({ where: { user_id: testUser.id } }),
    prisma.user_follows_studio.deleteMany({ where: { user_id: testUser.id } }),
    prisma.list_items.deleteMany({ where: { user_lists: { user_id: testUser.id } } }),
  ]);

  let watchlist = await prisma.user_lists.findFirst({
    where: { user_id: testUser.id, type: 'watchlist' },
    orderBy: { created_at: 'asc' },
  });
  if (!watchlist) {
    watchlist = await prisma.user_lists.create({
      data: {
        user_id: testUser.id,
        nom: 'Ma Watchlist',
        type: 'watchlist',
        description: 'Films et séries à voir',
      },
    });
  }
  const favoris = await prisma.user_lists.findFirst({
    where: { user_id: testUser.id, type: 'favoris' },
  });
  if (!favoris) {
    await prisma.user_lists.create({
      data: {
        user_id: testUser.id,
        nom: 'Mes Favoris',
        type: 'favoris',
        description: 'Mes titres préférés',
      },
    });
  }

  // --- Pool de titres "du compte d'elie" (watches + ratings + list_items) ---
  const [elieWatches, elieRatings, elieListItems] = await Promise.all([
    prisma.user_watches.findMany({
      where: { user_id: elie.id, title_id: { not: null } },
      select: { title_id: true },
    }),
    prisma.user_ratings.findMany({
      where: { user_id: elie.id, title_id: { not: null } },
      select: { title_id: true },
    }),
    prisma.list_items.findMany({
      where: { user_lists: { user_id: elie.id } },
      select: { title_id: true, user_lists: { select: { type: true } } },
    }),
  ]);

  const watchedPoolIds = Array.from(
    new Set(
      [...elieWatches, ...elieRatings, ...elieListItems]
        .map((r) => r.title_id)
        .filter((id): id is string => !!id),
    ),
  );

  const elieWatchlistTitleIds = Array.from(
    new Set(
      elieListItems
        .filter((i) => i.user_lists.type === 'watchlist')
        .map((i) => i.title_id),
    ),
  );

  // --- ~100 titres "vus" (watches + une partie de notes) ---
  const watchedSelection = shuffle(watchedPoolIds).slice(
    0,
    Math.min(TARGET_WATCHED, watchedPoolIds.length),
  );

  await prisma.user_watches.createMany({
    data: watchedSelection.map((titleId) => ({
      user_id: testUser.id,
      title_id: titleId,
      date_vue: randomPastDate(730),
    })),
  });

  const ratedSelection = shuffle(watchedSelection).slice(
    0,
    Math.round(watchedSelection.length * RATING_RATE),
  );
  await prisma.user_ratings.createMany({
    data: ratedSelection.map((titleId) => ({
      user_id: testUser.id,
      title_id: titleId,
      note_perso: randomNote(),
    })),
  });

  // --- Watchlist : titres du watchlist d'elie non déjà "vus" par test ---
  const watchedSet = new Set(watchedSelection);
  const watchlistCandidates = shuffle(
    elieWatchlistTitleIds.filter((id) => !watchedSet.has(id)),
  ).slice(0, TARGET_WATCHLIST);

  await prisma.list_items.createMany({
    data: watchlistCandidates.map((titleId, index) => ({
      list_id: watchlist!.id,
      title_id: titleId,
      position: index,
    })),
    skipDuplicates: true,
  });

  // --- Follows : tirage indépendant dans le catalogue global ---
  const [allPeopleIds, allStudioIds] = await Promise.all([
    prisma.people.findMany({ select: { id: true }, take: 2000 }),
    prisma.studios.findMany({ select: { id: true }, take: 2000 }),
  ]);

  const followedPeople = shuffle(allPeopleIds).slice(0, TARGET_FOLLOWED_PEOPLE);
  const followedStudios = shuffle(allStudioIds).slice(0, TARGET_FOLLOWED_STUDIOS);

  await Promise.all([
    prisma.user_follows_person.createMany({
      data: followedPeople.map((p) => ({ user_id: testUser.id, person_id: p.id })),
      skipDuplicates: true,
    }),
    prisma.user_follows_studio.createMany({
      data: followedStudios.map((s) => ({ user_id: testUser.id, studio_id: s.id })),
      skipDuplicates: true,
    }),
  ]);

  // --- Séries suivies : quelques séries parmi celles "vues" ---
  const watchedSeries = await prisma.titles.findMany({
    where: { id: { in: watchedSelection }, type: 'serie' },
    select: { id: true },
  });
  const followedSeries = shuffle(watchedSeries).slice(0, TARGET_FOLLOWED_SERIES);
  await prisma.user_follows_serie.createMany({
    data: followedSeries.map((s) => ({ user_id: testUser.id, title_id: s.id })),
    skipDuplicates: true,
  });

  console.log(`Titres vus : ${watchedSelection.length} (dont ${ratedSelection.length} notés)`);
  console.log(`Watchlist : ${watchlistCandidates.length}`);
  console.log(`Personnes suivies : ${followedPeople.length}`);
  console.log(`Studios suivis : ${followedStudios.length}`);
  console.log(`Séries suivies : ${followedSeries.length}`);
}

main()
  .catch((error) => {
    console.error('[seed_test_account] Erreur :', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
