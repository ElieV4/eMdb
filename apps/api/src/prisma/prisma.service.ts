import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { prisma } from '@emdb/db';

/**
 * Service NestJS qui enveloppe le singleton Prisma partagé (@emdb/db).
 *
 * Le singleton `prisma` est réexporté depuis @emdb/db pour éviter d'ouvrir
 * plusieurs pools de connexions Postgres. Ce service expose le client Prisma
 * directement (via `this.prisma`) ainsi que les delegates model (ex: `this.users`)
 * pour un accès pratique dans les services métier.
 *
 * @see packages/db/index.ts
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  // Expose le client Prisma complet pour accéder à toutes les models
  // et aux méthodes $queryRaw / $executeRaw / $transaction.
  protected readonly prisma = prisma;

  // Delegates model pour un accès pratique (ex: this.prisma.users.findUnique)
  users = prisma.users;
  titles = prisma.titles;
  title_genres = prisma.title_genres;
  title_countries = prisma.title_countries;
  title_studios = prisma.title_studios;
  title_recommendations = prisma.title_recommendations;
  credits = prisma.credits;
  roles = prisma.roles;
  seasons = prisma.seasons;
  episodes = prisma.episodes;
  people = prisma.people;
  person_recommendations = prisma.person_recommendations;
  genres = prisma.genres;
  countries = prisma.countries;
  studios = prisma.studios;
  user_ratings = prisma.user_ratings;
  user_watches = prisma.user_watches;
  list_items = prisma.list_items;
  user_lists = prisma.user_lists;
  list_shares = prisma.list_shares;
  user_follows_serie = prisma.user_follows_serie;
  user_follows_person = prisma.user_follows_person;
  user_follows_studio = prisma.user_follows_studio;
  notifications = prisma.notifications;
  push_tokens = prisma.push_tokens;
  free_watch_sites = prisma.free_watch_sites;

  /**
   * Exécute une requête SQL brute via Prisma.
   * Utile pour les appels aux vues matérialisées, fonctions PL/pgSQL,
   * et tout ce qui n'est pas modélisé dans le schéma Prisma.
   *
   * @param sql - Requête SQL avec paramètres
   * @param params - Paramètres optionnels (préparés)
   * @returns Résultat de la requête
   */
  async $queryRawUnsafe<T = any>(sql: string, ...params: any[]): Promise<T> {
    // @ts-ignore - Prisma $queryRawUnsafe type issue
    return prisma.$queryRawUnsafe<T>(sql, ...params);
  }

  /**
   * Exécute une requête SQL brute *paramétrée* via Prisma (valeurs liées,
   * jamais interpolées dans le texte de la requête) — contrairement à
   * `$queryRawUnsafe`, adapté quand une valeur ne peut pas être validée en
   * amont comme un UUID/nombre (ex. texte de recherche libre saisi par
   * l'utilisateur, modules dataviz : filtres "Titre"/"Acteur"/"Réalisateur"/
   * "Studio").
   *
   * @param query - Fragment construit via `Prisma.sql` (jamais une string brute)
   */
  async $queryRaw<T = any>(query: Prisma.Sql): Promise<T> {
    return prisma.$queryRaw<T>(query);
  }

  /**
   * Exécute une commande SQL brute (INSERT/UPDATE/DELETE) via Prisma.
   *
   * @param sql - Requête SQL avec paramètres
   * @param params - Paramètres optionnels
   * @returns Nombre de lignes affectées
   */
  async $executeRawUnsafe(sql: string, ...params: any[]): Promise<number> {
    return prisma.$executeRawUnsafe(sql, ...params);
  }

  /**
   * Exécute un tableau d'opérations dans une transaction Prisma.
   * Utile pour les mises à jour atomiques (ex: réordonnancement batch).
   *
   * @param operations - Tableau de promesses Prisma
   * @returns Les résultats des opérations
   */
  async $transaction(operations: any): Promise<any> {
    return prisma.$transaction(operations);
  }

  /**
   * Exécute `fn` dans une transaction où les policies RLS (migration
   * `enable_rls_user_scoped_tables`) scopent user_watches/user_ratings/
   * push_tokens/notifications/user_lists/list_items à `userId` (+ listes
   * partagées avec lui). `SET LOCAL` via `set_config(..., true)` : la
   * portée est strictement la transaction courante, jamais la connexion
   * (qui repasse dans le pool Prisma après coup) — indispensable pour ne
   * jamais faire fuiter le contexte d'un utilisateur vers la requête
   * suivante réutilisant la même connexion.
   *
   * À utiliser pour toute opération sur ces tables agissant au nom de
   * l'utilisateur authentifié de la requête en cours. Pour une opération
   * légitimement transverse à tous les utilisateurs (stats admin,
   * vérification avant suppression, notification à l'admin), voir
   * `asSystem()`.
   */
  async forUser<T>(userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
      return fn(tx);
    });
  }

  /**
   * Exécute `fn` dans une transaction qui contourne explicitement les
   * policies RLS pour une opération légitimement transverse à tous les
   * utilisateurs (ex. compter les references d'un titre avant suppression,
   * stats admin du recommender, notification à l'admin lors d'une
   * inscription). Réservé aux call sites qui ne dépendent d'aucune entrée
   * utilisateur pour décider du bypass — jamais conditionné par une donnée
   * de requête.
   */
  async asSystem<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'true', true)`;
      return fn(tx);
    });
  }

  onModuleDestroy() {
    return prisma.$disconnect();
  }
}
