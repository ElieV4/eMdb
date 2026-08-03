import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WatchTimeQueryDto } from './dto/watch-time-query.dto';
import { WatchCountQueryDto } from './dto/watch-count-query.dto';
import {
  DatavizAggregation,
  DatavizGranularity,
  DatavizGroupBy,
  DatavizMetric,
  DatavizQueryDto,
  TOP20_GROUP_BYS,
} from './dto/dataviz-query.dto';

export type DatavizFilterOptionKind = 'title' | 'actor' | 'director' | 'studio';
export type DatavizFilterOption = { id: string; nom: string };

type DatavizRow = {
  category_id: string | null;
  category: string;
  series_id?: string | null;
  series?: string;
  value: number | null;
};
type DatavizResult = { total: number | null; rows: DatavizRow[] };

/**
 * Service métier pour le module dataviz (Phase 6.1, puis modification W).
 *
 * Deux générations de méthodes cohabitent :
 * - getWatchTime/getWatchCount (Phase 6.1) : exposent les 8 vues
 *   matérialisées `mv_watch_*` (SQL pur, hors schéma Prisma), groupées par
 *   period/genre/country/animation — plus consommées par le frontend
 *   depuis la modification W (gardées pour compatibilité/tests).
 * - query() (modification W) : endpoint unique alimentant les 8 visuels
 *   dataviz de la page Profil, chacun avec son propre menu métrique/
 *   agrégation/groupement/filtres — requête `user_watches` directement (pas
 *   de vue matérialisée), voir `DatavizQueryDto` pour le détail du modèle.
 */
@Injectable()
export class DatavizService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère le temps de visionnage (en minutes) groupé par le critère demandé.
   *
   * Filtrage année :
   * - Vues 'period' : WHERE EXTRACT(YEAR FROM periode_semaine) BETWEEN yearFrom AND yearTo
   * - Vues 'genre', 'country', 'animation' : sous-requête EXISTS sur user_watches
   *   (les MV n'ont pas de colonne date)
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param query - DTO avec groupBy et filtres optionnels
   * @returns Tableau de résultats (dépend du groupBy)
   */
  async getWatchTime(userId: string, query: WatchTimeQueryDto): Promise<any[]> {
    switch (query.groupBy) {
      case 'period':
        return this.getWatchTimeByPeriod(userId, query.yearFrom, query.yearTo);
      case 'genre':
        return this.getWatchTimeByGenre(userId, query.yearFrom, query.yearTo);
      case 'country':
        return this.getWatchTimeByCountry(userId, query.yearFrom, query.yearTo);
      case 'animation':
        return this.getWatchTimeByAnimation(userId, query.yearFrom, query.yearTo);
      default:
        return [];
    }
  }

  /**
   * Récupère le nombre de visionnages groupé par le critère demandé.
   * Même logique de filtrage année que getWatchTime.
   *
   * @param userId - UUID de l'utilisateur connecté
   * @param query - DTO avec groupBy et filtres optionnels
   * @returns Tableau de résultats (dépend du groupBy)
   */
  async getWatchCount(userId: string, query: WatchCountQueryDto): Promise<any[]> {
    switch (query.groupBy) {
      case 'period':
        return this.getWatchCountByPeriod(userId, query.yearFrom, query.yearTo);
      case 'genre':
        return this.getWatchCountByGenre(userId, query.yearFrom, query.yearTo);
      case 'country':
        return this.getWatchCountByCountry(userId, query.yearFrom, query.yearTo);
      case 'animation':
        return this.getWatchCountByAnimation(userId, query.yearFrom, query.yearTo);
      default:
        return [];
    }
  }

  /**
   * Construit une clause ORDER BY sécurisée.
   * Les noms de colonnes sont validés pour éviter les injections SQL.
   */
  private orderBy(col: string): string {
    const whitelist = ['periode_semaine', 'genre_id', 'country_id', 'is_animation'];
    if (whitelist.includes(col)) {
      return ` ORDER BY ${col}`;
    }
    return '';
  }

  /**
   * Exécute une requête SQL brute sur les vues matérialisées dataviz.
   *
   * Les colonnes `SUM(...)`/`COUNT(*)` des vues (minutes, nb_items) sont des
   * `bigint` PostgreSQL, que le driver renvoie en `BigInt` JS — que
   * `JSON.stringify` (utilisé par la sérialisation de réponse Express) ne
   * sait pas sérialiser ("Do not know how to serialize a BigInt"), ce qui
   * faisait échouer tous les endpoints dataviz en 500 (bug #54).
   * Converti en `Number` : sans risque de perte de précision réaliste ici
   * (minutes ou nombre de visionnages d'un seul utilisateur).
   */
  private async queryRaw<T = any>(sql: string): Promise<T[]> {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(sql);
    return (rows || []).map((row) => {
      const safe: any = {};
      for (const [key, value] of Object.entries(row)) {
        safe[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      return safe;
    }) as T[];
  }

  // ======================================================================
  // Watch Time
  // ======================================================================

  /**
   * Temps de visionnage groupé par période (semaine).
   * Filtre année via EXTRACT(YEAR) direct sur la MV.
   */
  private async getWatchTimeByPeriod(
    userId: string,
    yearFrom?: number,
    yearTo?: number,
  ): Promise<any[]> {
    let sql = `SELECT * FROM mv_watch_time_by_period WHERE user_id='${userId}'::UUID`;
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ?? 1900;
      const toVal = yearTo ?? 2100;
      sql += ` AND EXTRACT(YEAR FROM periode_semaine) BETWEEN ${from} AND ${toVal}`;
    }
    sql += this.orderBy('periode_semaine');
    return this.queryRaw(sql);
  }

  /**
   * Temps de visionnage groupé par genre.
   * Filtre année via sous-requête EXISTS sur user_watches → titles → title_genres.
   */
  private async getWatchTimeByGenre(
    userId: string,
    yearFrom?: number,
    yearTo?: number,
  ): Promise<any[]> {
    let sql = `SELECT wtg.* FROM mv_watch_time_by_genre wtg WHERE wtg.user_id='${userId}'::UUID`;
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ?? 1900;
      const toVal = yearTo ?? 2100;
      sql += ` AND EXISTS (
        SELECT 1 FROM user_watches uw
        JOIN titles t ON t.id = uw.title_id
        JOIN title_genres tg ON tg.title_id = t.id
        WHERE uw.user_id='${userId}'::UUID
        AND tg.genre_id = wtg.genre_id
        AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN ${from} AND ${toVal}
      )`;
    }
    sql += this.orderBy('genre_id');
    return this.queryRaw(sql);
  }

  /**
   * Temps de visionnage groupé par pays.
   * Filtre année via sous-requête EXISTS sur user_watches → titles → title_countries.
   */
  private async getWatchTimeByCountry(
    userId: string,
    yearFrom?: number,
    yearTo?: number,
  ): Promise<any[]> {
    let sql = `SELECT wtc.* FROM mv_watch_time_by_country wtc WHERE wtc.user_id='${userId}'::UUID`;
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ?? 1900;
      const toVal = yearTo ?? 2100;
      sql += ` AND EXISTS (
        SELECT 1 FROM user_watches uw
        JOIN titles t ON t.id = uw.title_id
        JOIN title_countries tc ON tc.title_id = t.id
        WHERE uw.user_id='${userId}'::UUID
        AND tc.country_id = wtc.country_id
        AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN ${from} AND ${toVal}
      )`;
    }
    sql += this.orderBy('country_id');
    return this.queryRaw(sql);
  }

  /**
   * Temps de visionnage groupé par is_animation.
   * Filtre année via sous-requête EXISTS sur user_watches → titles.
   */
  private async getWatchTimeByAnimation(
    userId: string,
    yearFrom?: number,
    yearTo?: number,
  ): Promise<any[]> {
    let sql = `SELECT wta.* FROM mv_watch_time_by_animation wta WHERE wta.user_id='${userId}'::UUID`;
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ?? 1900;
      const toVal = yearTo ?? 2100;
      sql += ` AND EXISTS (
        SELECT 1 FROM user_watches uw
        JOIN titles t ON t.id = uw.title_id
        WHERE uw.user_id='${userId}'::UUID
        AND t.is_animation = wta.is_animation
        AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN ${from} AND ${toVal}
      )`;
    }
    sql += this.orderBy('is_animation');
    return this.queryRaw(sql);
  }

  // ======================================================================
  // Watch Count
  // ======================================================================

  /**
   * Nombre de visionnages groupé par période.
   */
  private async getWatchCountByPeriod(
    userId: string,
    yearFrom?: number,
    yearTo?: number,
  ): Promise<any[]> {
    let sql = `SELECT * FROM mv_watch_count_by_period WHERE user_id='${userId}'::UUID`;
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ?? 1900;
      const toVal = yearTo ?? 2100;
      sql += ` AND EXTRACT(YEAR FROM periode_semaine) BETWEEN ${from} AND ${toVal}`;
    }
    sql += this.orderBy('periode_semaine');
    return this.queryRaw(sql);
  }

  /**
   * Nombre de visionnages groupé par genre.
   */
  private async getWatchCountByGenre(
    userId: string,
    yearFrom?: number,
    yearTo?: number,
  ): Promise<any[]> {
    let sql = `SELECT wcg.* FROM mv_watch_count_by_genre wcg WHERE wcg.user_id='${userId}'::UUID`;
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ?? 1900;
      const toVal = yearTo ?? 2100;
      sql += ` AND EXISTS (
        SELECT 1 FROM user_watches uw
        JOIN titles t ON t.id = uw.title_id
        JOIN title_genres tg ON tg.title_id = t.id
        WHERE uw.user_id='${userId}'::UUID
        AND tg.genre_id = wcg.genre_id
        AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN ${from} AND ${toVal}
      )`;
    }
    sql += this.orderBy('genre_id');
    return this.queryRaw(sql);
  }

  /**
   * Nombre de visionnages groupé par pays.
   */
  private async getWatchCountByCountry(
    userId: string,
    yearFrom?: number,
    yearTo?: number,
  ): Promise<any[]> {
    let sql = `SELECT wcc.* FROM mv_watch_count_by_country wcc WHERE wcc.user_id='${userId}'::UUID`;
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ?? 1900;
      const toVal = yearTo ?? 2100;
      sql += ` AND EXISTS (
        SELECT 1 FROM user_watches uw
        JOIN titles t ON t.id = uw.title_id
        JOIN title_countries tc ON tc.title_id = t.id
        WHERE uw.user_id='${userId}'::UUID
        AND tc.country_id = wcc.country_id
        AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN ${from} AND ${toVal}
      )`;
    }
    sql += this.orderBy('country_id');
    return this.queryRaw(sql);
  }

  /**
   * Nombre de visionnages groupé par is_animation.
   */
  private async getWatchCountByAnimation(
    userId: string,
    yearFrom?: number,
    yearTo?: number,
  ): Promise<any[]> {
    let sql = `SELECT wca.* FROM mv_watch_count_by_animation wca WHERE wca.user_id='${userId}'::UUID`;
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ?? 1900;
      const toVal = yearTo ?? 2100;
      sql += ` AND EXISTS (
        SELECT 1 FROM user_watches uw
        JOIN titles t ON t.id = uw.title_id
        WHERE uw.user_id='${userId}'::UUID
        AND t.is_animation = wca.is_animation
        AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN ${from} AND ${toVal}
      )`;
    }
    sql += this.orderBy('is_animation');
    return this.queryRaw(sql);
  }

  // ======================================================================
  // Modification W — menu unifié (métrique/agrégation/groupement/filtres)
  // ======================================================================

  private readonly durationExpr = 'COALESCE(e.duree_minutes, t.duree_minutes, 0)';

  /**
   * Expression SQL de catégorie pour la granularité "période" demandée
   * — deux familles :
   * - Fixe (day/month/quarter/year) : un point par tranche de calendrier
   *   réelle, via `date_trunc` (résultat = horodatage, formaté comme une
   *   date côté frontend).
   * - Agrégée (hour/dayQuarter/weekday/monthOfYear/season) : cyclique,
   *   toutes années confondues — résultat = un petit entier ordinal
   *   (formaté via une table de correspondance côté frontend, pas une
   *   date).
   */
  private periodCategoryExpr(granularity: DatavizGranularity): string {
    switch (granularity) {
      case 'day':
        return `date_trunc('day', uw.date_vue)`;
      case 'quarter':
        return `date_trunc('quarter', uw.date_vue)`;
      case 'year':
        return `date_trunc('year', uw.date_vue)`;
      case 'hour':
        return `EXTRACT(HOUR FROM uw.date_vue)::INT`;
      case 'dayQuarter':
        // 1=Matin [6h,12h) 2=Après-midi [12h,18h) 3=Soirée [18h,24h) 4=Nuit [0h,6h)
        return `(CASE
          WHEN EXTRACT(HOUR FROM uw.date_vue) >= 6 AND EXTRACT(HOUR FROM uw.date_vue) < 12 THEN 1
          WHEN EXTRACT(HOUR FROM uw.date_vue) >= 12 AND EXTRACT(HOUR FROM uw.date_vue) < 18 THEN 2
          WHEN EXTRACT(HOUR FROM uw.date_vue) >= 18 THEN 3
          ELSE 4
        END)`;
      case 'weekday':
        // ISODOW : 1=Lundi ... 7=Dimanche
        return `EXTRACT(ISODOW FROM uw.date_vue)::INT`;
      case 'monthOfYear':
        return `EXTRACT(MONTH FROM uw.date_vue)::INT`;
      case 'season':
        // 1=Hiver(déc-jan-fév) 2=Printemps(mar-avr-mai) 3=Été(juin-juil-août) 4=Automne(sep-oct-nov)
        return `(CASE
          WHEN EXTRACT(MONTH FROM uw.date_vue) IN (12, 1, 2) THEN 1
          WHEN EXTRACT(MONTH FROM uw.date_vue) IN (3, 4, 5) THEN 2
          WHEN EXTRACT(MONTH FROM uw.date_vue) IN (6, 7, 8) THEN 3
          ELSE 4
        END)`;
      case 'month':
      default:
        return `date_trunc('month', uw.date_vue)`;
    }
  }

  /** `AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN x AND y`, ou '' si aucune borne (filtre "Année de visionnage"). */
  private watchedYearFilter(min?: number, max?: number): string {
    if (min === undefined && max === undefined) return '';
    const from = min ?? 1900;
    const to = max ?? 2100;
    return ` AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN ${from} AND ${to}`;
  }

  /**
   * Filtres "type header" (genre/pays/studio/année de sortie/note IMDB/
   * listes) — intégrés au menu "⋮" de chaque visuel dataviz. Les ids sont
   * validés en UUID par le DTO (`DatavizFilterQueryDto`) avant d'atteindre
   * cette méthode — même garantie que `userId` pour l'interpolation SQL
   * directe. Suppose l'alias `t` (titles) en scope à l'endroit de l'appel.
   */
  private extraFilters(query: {
    genreIds?: string[];
    countryIds?: string[];
    studioIds?: string[];
    listIds?: string[];
    titleIds?: string[];
    actorIds?: string[];
    directorIds?: string[];
    releaseYearMin?: number;
    releaseYearMax?: number;
    noteImdbMin?: number;
    noteImdbMax?: number;
  }): string {
    let sql = '';
    if (query.genreIds && query.genreIds.length > 0) {
      const ids = query.genreIds.map((id) => `'${id}'::UUID`).join(',');
      sql += ` AND EXISTS (SELECT 1 FROM title_genres tgf WHERE tgf.title_id = t.id AND tgf.genre_id IN (${ids}))`;
    }
    if (query.countryIds && query.countryIds.length > 0) {
      const ids = query.countryIds.map((id) => `'${id}'::UUID`).join(',');
      sql += ` AND EXISTS (SELECT 1 FROM title_countries tcf WHERE tcf.title_id = t.id AND tcf.country_id IN (${ids}))`;
    }
    if (query.studioIds && query.studioIds.length > 0) {
      const ids = query.studioIds.map((id) => `'${id}'::UUID`).join(',');
      sql += ` AND EXISTS (SELECT 1 FROM title_studios tsf WHERE tsf.title_id = t.id AND tsf.studio_id IN (${ids}))`;
    }
    if (query.listIds && query.listIds.length > 0) {
      const ids = query.listIds.map((id) => `'${id}'::UUID`).join(',');
      sql += ` AND EXISTS (SELECT 1 FROM list_items lif WHERE lif.title_id = t.id AND lif.list_id IN (${ids}))`;
    }
    if (query.titleIds && query.titleIds.length > 0) {
      const ids = query.titleIds.map((id) => `'${id}'::UUID`).join(',');
      sql += ` AND t.id IN (${ids})`;
    }
    if (query.actorIds && query.actorIds.length > 0) {
      const ids = query.actorIds.map((id) => `'${id}'::UUID`).join(',');
      sql += ` AND EXISTS (SELECT 1 FROM credits crf JOIN roles rf ON rf.id = crf.role_id AND rf.code = 'acteur' WHERE crf.title_id = t.id AND crf.person_id IN (${ids}))`;
    }
    if (query.directorIds && query.directorIds.length > 0) {
      const ids = query.directorIds.map((id) => `'${id}'::UUID`).join(',');
      sql += ` AND EXISTS (SELECT 1 FROM credits crf JOIN roles rf ON rf.id = crf.role_id AND rf.code = 'realisateur' WHERE crf.title_id = t.id AND crf.person_id IN (${ids}))`;
    }
    if (query.releaseYearMin !== undefined) {
      sql += ` AND t.date_sortie IS NOT NULL AND EXTRACT(YEAR FROM t.date_sortie) >= ${query.releaseYearMin}`;
    }
    if (query.releaseYearMax !== undefined) {
      sql += ` AND t.date_sortie IS NOT NULL AND EXTRACT(YEAR FROM t.date_sortie) <= ${query.releaseYearMax}`;
    }
    if (query.noteImdbMin !== undefined) {
      sql += ` AND t.note_imdb IS NOT NULL AND t.note_imdb >= ${query.noteImdbMin}`;
    }
    if (query.noteImdbMax !== undefined) {
      sql += ` AND t.note_imdb IS NOT NULL AND t.note_imdb <= ${query.noteImdbMax}`;
    }
    return sql;
  }

  /** Clause WHERE commune (utilisateur + filtre année de visionnage + filtre type de média + filtres "header"). */
  private buildWhere(userId: string, query: DatavizQueryDto, titleAlias: string): string {
    let sql = `uw.user_id='${userId}'::UUID`;
    sql += this.watchedYearFilter(query.watchedYearMin, query.watchedYearMax);
    if (query.mediaType) {
      sql += ` AND ${titleAlias}.type = '${query.mediaType}'`;
    }
    sql += this.extraFilters(query);
    return sql;
  }

  /**
   * Morceaux de requête pour un groupement (id/libellé/jointure/GROUP BY/
   * ORDER BY) — partagés par `rowsStandard`/`rowsTop20`/`rowsEvolution`/
   * `rowsNoteAvg` (axe "Groupement" ET axe "Légende").
   *
   * `aliasSuffix` évite les collisions d'alias SQL quand cette méthode est
   * appelée deux fois dans la même requête (axe "Groupement" avec suffixe
   * vide, axe "Légende" avec un suffixe, ex. `'2'`) — y compris quand les
   * deux axes portent sur le même groupement (ex. Groupement=Genre,
   * Légende=Genre : deux jointures distinctes vers `title_genres`/`genres`).
   */
  private categoryPieces(
    groupBy: DatavizGroupBy,
    granularity: DatavizGranularity,
    aliasSuffix: string = '',
  ): { categoryIdExpr: string; categoryExpr: string; joinSql: string; groupByExpr: string; orderExpr: string } {
    switch (groupBy) {
      case 'mediaType':
        return {
          categoryIdExpr: 'NULL::TEXT',
          categoryExpr: `(CASE WHEN t.type = 'film' THEN 'Film' ELSE 'Série' END)`,
          joinSql: '',
          groupByExpr: 't.type',
          orderExpr: 't.type',
        };
      case 'period': {
        const trunc = this.periodCategoryExpr(granularity);
        return {
          categoryIdExpr: 'NULL::TEXT',
          categoryExpr: `(${trunc})::TEXT`,
          joinSql: '',
          groupByExpr: `(${trunc})`,
          orderExpr: `(${trunc})`,
        };
      }
      case 'genre': {
        const g = `g${aliasSuffix}`;
        const tg = `tg${aliasSuffix}`;
        return {
          categoryIdExpr: `${g}.id::TEXT`,
          categoryExpr: `${g}.nom`,
          joinSql: `JOIN title_genres ${tg} ON ${tg}.title_id = t.id JOIN genres ${g} ON ${g}.id = ${tg}.genre_id`,
          groupByExpr: `${g}.id, ${g}.nom`,
          orderExpr: `${g}.nom`,
        };
      }
      case 'country': {
        const c = `c${aliasSuffix}`;
        const tc = `tc${aliasSuffix}`;
        return {
          categoryIdExpr: `${c}.id::TEXT`,
          categoryExpr: `${c}.nom`,
          joinSql: `JOIN title_countries ${tc} ON ${tc}.title_id = t.id JOIN countries ${c} ON ${c}.id = ${tc}.country_id`,
          groupByExpr: `${c}.id, ${c}.nom`,
          orderExpr: `${c}.nom`,
        };
      }
      case 'studio': {
        const st = `st${aliasSuffix}`;
        const ts = `ts${aliasSuffix}`;
        return {
          categoryIdExpr: `${st}.id::TEXT`,
          categoryExpr: `${st}.nom`,
          joinSql: `JOIN title_studios ${ts} ON ${ts}.title_id = t.id JOIN studios ${st} ON ${st}.id = ${ts}.studio_id`,
          groupByExpr: `${st}.id, ${st}.nom`,
          orderExpr: `${st}.nom`,
        };
      }
      case 'title':
        // `t` est déjà en scope (jointure principale de toutes les requêtes
        // dataviz) — aucune jointure supplémentaire nécessaire, contrairement
        // à genre/pays/studio/acteur/réalisateur.
        return {
          categoryIdExpr: 't.id::TEXT',
          categoryExpr: 'COALESCE(t.titre_vf, t.titre_vo)',
          joinSql: '',
          groupByExpr: 't.id, t.titre_vf, t.titre_vo',
          orderExpr: 't.id',
        };
      case 'actor':
      case 'director': {
        // Sous-requête dédupliquée (title_id, person_id) : un même acteur
        // peut avoir plusieurs lignes `credits` pour un même titre (casting
        // principal + apparitions par épisode) — sans ce DISTINCT en amont,
        // un visionnage serait compté plusieurs fois pour cette personne.
        const roleCode = groupBy === 'actor' ? 'acteur' : 'realisateur';
        const p = `p${aliasSuffix}`;
        const rc = `rc${aliasSuffix}`;
        return {
          categoryIdExpr: `${p}.id::TEXT`,
          categoryExpr: `${p}.nom`,
          joinSql: `JOIN (SELECT DISTINCT cr.title_id, cr.person_id FROM credits cr JOIN roles r ON r.id = cr.role_id AND r.code = '${roleCode}') ${rc} ON ${rc}.title_id = t.id JOIN people ${p} ON ${p}.id = ${rc}.person_id`,
          groupByExpr: `${p}.id, ${p}.nom`,
          orderExpr: `${p}.nom`,
        };
      }
      case 'none':
      default:
        return { categoryIdExpr: 'NULL::TEXT', categoryExpr: `'Total'`, joinSql: '', groupByExpr: '', orderExpr: '' };
    }
  }

  /** Expression SQL de la valeur agrégée, pour le chemin "standard" (une seule GROUP BY, pas de dédoublonnage titre). */
  private valueAggExpr(
    metric: DatavizMetric,
    aggregation: DatavizAggregation,
    cols: { idCol: string; minutesCol: string; noteCol: string },
  ): string {
    if (metric === 'duration') {
      switch (aggregation) {
        case 'sum':
          return `SUM(${cols.minutesCol})`;
        case 'min':
          return `MIN(${cols.minutesCol})`;
        case 'max':
          return `MAX(${cols.minutesCol})`;
        case 'avg':
          return `AVG(${cols.minutesCol})`;
      }
    }
    if (metric === 'watches') {
      if (aggregation === 'count') return 'COUNT(*)';
      if (aggregation === 'distinctCount') return `COUNT(DISTINCT ${cols.idCol})`;
    }
    if (metric === 'titles') {
      // "count" et "distinctCount" identiques : la métrique "titres" opère déjà au niveau du titre.
      return `COUNT(DISTINCT ${cols.idCol})`;
    }
    if (metric === 'note') {
      if (aggregation === 'count' || aggregation === 'distinctCount') {
        return `COUNT(DISTINCT CASE WHEN ${cols.noteCol} IS NOT NULL THEN ${cols.idCol} END)`;
      }
      if (aggregation === 'min') return `MIN(${cols.noteCol})`;
      if (aggregation === 'max') return `MAX(${cols.noteCol})`;
    }
    throw new Error(`Combinaison métrique/agrégation non supportée par rowsStandard : ${metric}/${aggregation}`);
  }

  /**
   * Endpoint unique `GET /dataviz/query` — dispatch vers l'implémentation
   * adaptée à la combinaison métrique/agrégation/groupement, puis calcule
   * `total` (agrégat sur l'ensemble des données, `groupBy` forcé à `none`)
   * quand `groupBy != 'none'`, pour l'affichage "total ET par groupement"
   * des datacards (les graphiques ignorent simplement ce champ).
   */
  async query(userId: string, dto: DatavizQueryDto): Promise<DatavizResult> {
    const rows = (await this.queryRows(userId, dto)).map((row) => this.coerceRowValue(row));
    if (dto.groupBy === 'none') {
      return { total: null, rows };
    }
    const totalRows = await this.queryRows(userId, { ...dto, groupBy: 'none' });
    const total = this.coerceRowValue(totalRows[0])?.value ?? null;
    return { total, rows };
  }

  /**
   * `AVG()`/`ROUND()` et les colonnes `DECIMAL` (`note_imdb`) reviennent en
   * `NUMERIC` PostgreSQL, que le driver `pg` renvoie en **chaîne** (pas en
   * `Number`) par défaut — pour éviter une perte de précision silencieuse
   * sur de gros nombres. `queryRaw()` (bug #54) ne convertit que les
   * `BigInt`, pas ces chaînes numériques ; sans cette conversion,
   * `formatDatavizValue` (frontend) plante sur `value.toFixed(...)`. Toutes
   * les valeurs de `/dataviz/query` passent par ce point unique (`query()`
   * seul appelant public), donc corrigé ici plutôt que dans chacune des 6
   * méthodes `rowsX` — `null` (évolution sans période précédente) reste
   * `null`, jamais coercé en `0`.
   */
  private coerceRowValue(row: DatavizRow | undefined): DatavizRow | undefined {
    if (!row) return row;
    return { ...row, value: row.value === null || row.value === undefined ? null : Number(row.value) };
  }

  private async queryRows(userId: string, dto: DatavizQueryDto): Promise<DatavizRow[]> {
    if (TOP20_GROUP_BYS.includes(dto.groupBy)) {
      return this.rowsTop20(userId, dto);
    }
    const restrictedToPeriod =
      (dto.metric === 'watches' || dto.metric === 'titles') &&
      (['min', 'max', 'avg', 'evolution'] as DatavizAggregation[]).includes(dto.aggregation);
    if (restrictedToPeriod) {
      return this.rowsPeriodCollapsed(userId, dto);
    }
    if (dto.aggregation === 'evolution') {
      return this.rowsEvolution(userId, dto);
    }
    if (dto.metric === 'note' && dto.aggregation === 'avg') {
      return this.rowsNoteAvg(userId, dto);
    }
    return this.rowsStandard(userId, dto);
  }

  /**
   * Groupements none/mediaType/period/genre/country — chemin standard
   * (count/distinctCount/sum/min/max). Supporte un axe "Légende" optionnel
   * (`dto.legendBy`) — même mécanisme que "Groupement", appelé une 2ème
   * fois avec un suffixe d'alias pour éviter toute collision SQL.
   */
  private async rowsStandard(userId: string, dto: DatavizQueryDto): Promise<DatavizRow[]> {
    const granularity = dto.granularity ?? 'month';
    const pieces = this.categoryPieces(dto.groupBy, granularity);
    const legend = dto.legendBy && dto.legendBy !== 'none' ? this.categoryPieces(dto.legendBy, granularity, '2') : null;
    const val = this.valueAggExpr(dto.metric, dto.aggregation, {
      idCol: 't.id',
      minutesCol: this.durationExpr,
      noteCol: 't.note_imdb',
    });
    const where = this.buildWhere(userId, dto, 't');
    const legendSelect = legend ? `, ${legend.categoryIdExpr} AS series_id, ${legend.categoryExpr} AS series` : '';
    const groupByAll = [pieces.groupByExpr, legend?.groupByExpr].filter(Boolean).join(', ');
    const orderByAll = [pieces.orderExpr, legend?.orderExpr].filter(Boolean).join(', ');
    const sql = `
      SELECT ${pieces.categoryIdExpr} AS category_id, ${pieces.categoryExpr} AS category${legendSelect}, ${val} AS value
      FROM user_watches uw
      LEFT JOIN episodes e ON e.id = uw.episode_id
      LEFT JOIN seasons s ON s.id = e.season_id
      JOIN titles t ON t.id = COALESCE(uw.title_id, s.title_id)
      ${pieces.joinSql}
      ${legend?.joinSql ?? ''}
      WHERE ${where}
      ${groupByAll ? `GROUP BY ${groupByAll}` : ''}
      ${orderByAll ? `ORDER BY ${orderByAll}` : ''}
    `;
    return this.queryRaw<DatavizRow>(sql);
  }

  /**
   * Groupements "top 20" (`title`/`actor`/`director`/`studio`) : classement
   * des titres/acteurs/réalisateurs/studios les plus regardés, toujours
   * trié par valeur décroissante et plafonné à 20 lignes — jamais
   * l'intégralité de la catégorie (contrairement à genre/pays, dont la
   * cardinalité reste raisonnable). Supporte un axe "Légende" restreint à
   * `mediaType` (film/série) — les autres groupements de légende
   * (genre/pays/studio/period) n'ont pas de sens pour un classement top 20
   * (fan-out excessif ou redondant avec le classement lui-même). Restreint
   * à `duration`+`sum` ou `watches`/`titles`+`count`/`distinctCount` : les
   * autres combinaisons (note, min/max/avg/evolution) n'ont pas de sens
   * pour un classement — validé ici en plus du frontend (défense en
   * profondeur, l'API ne doit pas dépendre uniquement du menu).
   */
  private async rowsTop20(userId: string, dto: DatavizQueryDto): Promise<DatavizRow[]> {
    const validCombo =
      (dto.metric === 'duration' && dto.aggregation === 'sum') ||
      ((dto.metric === 'watches' || dto.metric === 'titles') &&
        (dto.aggregation === 'count' || dto.aggregation === 'distinctCount'));
    if (!validCombo) {
      throw new BadRequestException(
        `Le groupement "${dto.groupBy}" n'est disponible que pour Durée/Somme ou Visionnages-Titres/Nombre.`,
      );
    }

    const pieces = this.categoryPieces(dto.groupBy, dto.granularity ?? 'month');
    const val = this.valueAggExpr(dto.metric, dto.aggregation, {
      idCol: 't.id',
      minutesCol: this.durationExpr,
      noteCol: 't.note_imdb',
    });
    const where = this.buildWhere(userId, dto, 't');

    // Légende restreinte à `mediaType` pour les top 20 — divise chaque
    // barre en Film/Série. Les autres groupements de légende sont ignorés
    // (hors scope pour un classement).
    const legend = dto.legendBy === 'mediaType' ? this.categoryPieces('mediaType', dto.granularity ?? 'month', '2') : null;
    const legendSelect = legend ? `, ${legend.categoryIdExpr} AS series_id, ${legend.categoryExpr} AS series` : '';
    const groupByAll = [pieces.groupByExpr, legend?.groupByExpr].filter(Boolean).join(', ');
    const orderByAll = legend ? `value DESC, ${legend.orderExpr}` : 'value DESC';

    const sql = `
      SELECT ${pieces.categoryIdExpr} AS category_id, ${pieces.categoryExpr} AS category${legendSelect}, ${val} AS value
      FROM user_watches uw
      LEFT JOIN episodes e ON e.id = uw.episode_id
      LEFT JOIN seasons s ON s.id = e.season_id
      JOIN titles t ON t.id = COALESCE(uw.title_id, s.title_id)
      ${pieces.joinSql}
      WHERE ${where}
      GROUP BY ${groupByAll}
      ORDER BY ${orderByAll}
      LIMIT 20
    `;
    return this.queryRaw<DatavizRow>(sql);
  }

  /**
   * Agrégations min/max/avg/evolution pour les métriques `watches`/`titles`
   * — pas de sens par catégorie (genre/pays/studio/type de média), donc le
   * groupement choisi est ignoré : compte les visionnages (resp. titres
   * distincts) par tranche de période (granularité choisie, défaut mois),
   * puis min/max/moyenne/évolution sur cette série de compteurs — reprend
   * le principe de l'ancienne carte "Stats perso".
   */
  private async rowsPeriodCollapsed(userId: string, dto: DatavizQueryDto): Promise<DatavizRow[]> {
    const granularity = dto.granularity ?? 'month';
    const trunc = this.periodCategoryExpr(granularity);
    const cntExpr = dto.metric === 'watches' ? 'COUNT(*)' : 'COUNT(DISTINCT t.id)';
    const where = this.buildWhere(userId, dto, 't');
    const bucketsSql = `
      SELECT (${trunc}) AS bucket, ${cntExpr} AS cnt
      FROM user_watches uw
      LEFT JOIN episodes e ON e.id = uw.episode_id
      LEFT JOIN seasons s ON s.id = e.season_id
      JOIN titles t ON t.id = COALESCE(uw.title_id, s.title_id)
      WHERE ${where}
      GROUP BY (${trunc})
    `;
    if (dto.aggregation === 'evolution') {
      const sql = `
        WITH buckets AS (${bucketsSql}),
        ranked AS (SELECT *, ROW_NUMBER() OVER (ORDER BY bucket DESC) AS rn FROM buckets)
        SELECT
          CASE
            WHEN MAX(CASE WHEN rn = 2 THEN cnt END) IS NULL OR MAX(CASE WHEN rn = 2 THEN cnt END) = 0 THEN NULL
            ELSE ROUND((MAX(CASE WHEN rn = 1 THEN cnt END) - MAX(CASE WHEN rn = 2 THEN cnt END))::NUMERIC
              / MAX(CASE WHEN rn = 2 THEN cnt END) * 100, 1)
          END AS value
        FROM ranked
        WHERE rn <= 2
      `;
      const rows = await this.queryRaw<{ value: number | null }>(sql);
      return [{ category_id: null, category: 'Total', value: rows[0]?.value ?? null }];
    }
    const aggFn = dto.aggregation === 'min' ? 'MIN' : dto.aggregation === 'max' ? 'MAX' : 'AVG';
    const sql = `WITH buckets AS (${bucketsSql}) SELECT ${aggFn}(cnt) AS value FROM buckets`;
    const rows = await this.queryRaw<{ value: number | null }>(sql);
    return [{ category_id: null, category: 'Total', value: rows[0]?.value ?? 0 }];
  }

  /**
   * Agrégation `evolution` pour les métriques `duration`/`note` (non
   * restreintes) : compare la valeur agrégée de la dernière période à
   * celle de l'avant-dernière, par catégorie du groupement choisi (le
   * groupement `studio` y est en version "simple", sans repli "Autre" —
   * simplification documentée, cf. `categoryPieces`). Pour `note`, la
   * moyenne est calculée directement sur les lignes de visionnage (pas
   * dédoublonnée par titre comme `rowsNoteAvg`) — simplification du même
   * ordre, acceptable ici car `evolution` compare une tendance relative
   * plutôt qu'une valeur absolue.
   */
  private async rowsEvolution(userId: string, dto: DatavizQueryDto): Promise<DatavizRow[]> {
    const granularity = dto.granularity ?? 'month';
    const trunc = this.periodCategoryExpr(granularity);
    const pieces = this.categoryPieces(dto.groupBy, granularity);
    const primaryAgg = dto.metric === 'duration' ? `SUM(${this.durationExpr})` : `AVG(t.note_imdb)`;
    const where = this.buildWhere(userId, dto, 't');
    const sql = `
      WITH agg AS (
        SELECT ${pieces.categoryIdExpr} AS category_id, ${pieces.categoryExpr} AS category, (${trunc}) AS bucket, ${primaryAgg} AS val
        FROM user_watches uw
        LEFT JOIN episodes e ON e.id = uw.episode_id
        LEFT JOIN seasons s ON s.id = e.season_id
        JOIN titles t ON t.id = COALESCE(uw.title_id, s.title_id)
        ${pieces.joinSql}
        WHERE ${where}
        GROUP BY ${pieces.groupByExpr ? `${pieces.groupByExpr}, ` : ''}(${trunc})
      ),
      ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY category_id, category ORDER BY bucket DESC) AS rn FROM agg
      )
      SELECT category_id, category,
        CASE
          WHEN MAX(CASE WHEN rn = 2 THEN val END) IS NULL OR MAX(CASE WHEN rn = 2 THEN val END) = 0 THEN NULL
          ELSE ROUND((MAX(CASE WHEN rn = 1 THEN val END) - MAX(CASE WHEN rn = 2 THEN val END))::NUMERIC
            / MAX(CASE WHEN rn = 2 THEN val END) * 100, 1)
        END AS value
      FROM ranked
      WHERE rn <= 2
      GROUP BY category_id, category
    `;
    return this.queryRaw<DatavizRow>(sql);
  }

  /**
   * Agrégation `avg` pour la métrique `note` : dédoublonne d'abord par
   * titre (un titre a une seule note IMDB, quel que soit le nombre de fois
   * qu'il a été regardé ou d'épisodes vus) avant de moyenner — sinon un
   * titre revisionné plusieurs fois biaiserait la moyenne. Le groupement
   * `studio` y est en version "simple" (sans repli "Autre", cf.
   * `categoryPieces`) — même simplification documentée que `rowsEvolution`.
   */
  private async rowsNoteAvg(userId: string, dto: DatavizQueryDto): Promise<DatavizRow[]> {
    const pieces = this.categoryPieces(dto.groupBy, dto.granularity ?? 'month');
    const where = this.buildWhere(userId, dto, 't');
    const sql = `
      WITH deduped AS (
        SELECT DISTINCT ${pieces.categoryIdExpr} AS category_id, ${pieces.categoryExpr} AS category, t.id AS title_id, t.note_imdb
        FROM user_watches uw
        LEFT JOIN episodes e ON e.id = uw.episode_id
        LEFT JOIN seasons s ON s.id = e.season_id
        JOIN titles t ON t.id = COALESCE(uw.title_id, s.title_id)
        ${pieces.joinSql}
        WHERE ${where} AND t.note_imdb IS NOT NULL
      )
      SELECT category_id, category, AVG(note_imdb) AS value
      FROM deduped
      GROUP BY category_id, category
      ${pieces.orderExpr ? `ORDER BY ${pieces.orderExpr}` : ''}
    `;
    return this.queryRaw<DatavizRow>(sql);
  }

  // ======================================================================
  // Options des filtres "Titre"/"Acteur"/"Réalisateur"/"Studio" — menu "⋮"
  // ======================================================================

  /**
   * Échappe les caractères spéciaux `LIKE`/`ILIKE` (`%`, `_`, `\`) dans un
   * texte de recherche libre, pour qu'ils soient traités littéralement
   * plutôt que comme des jokers.
   */
  private escapeLikePattern(q: string): string {
    return q.replace(/[\\%_]/g, (char) => `\\${char}`);
  }

  /**
   * Options du dropdown "Titre"/"Acteur"/"Réalisateur"/"Studio" (menu "⋮"
   * de chaque visuel dataviz, modification "top 20") : sans `q`, les 20
   * entités les plus regardées par l'utilisateur (nombre de visionnages
   * décroissant) ; avec `q`, une recherche parmi les entités déjà regardées
   * — jamais tout le catalogue local, ces filtres ne servent qu'à affiner
   * les propres statistiques de l'utilisateur.
   *
   * `q` est un texte libre saisi par l'utilisateur (contrairement aux ids
   * genre/pays/studio/liste, jamais validable en amont comme un UUID) —
   * requête *paramétrée* via `Prisma.sql`/`$queryRaw` (valeur liée, jamais
   * interpolée dans le texte SQL), à la différence du reste de ce service.
   */
  async getFilterOptions(userId: string, kind: DatavizFilterOptionKind, q?: string): Promise<DatavizFilterOption[]> {
    const pattern = q && q.trim() ? `%${this.escapeLikePattern(q.trim())}%` : null;
    switch (kind) {
      case 'title':
        return this.filterOptionTitles(userId, pattern);
      case 'studio':
        return this.filterOptionStudios(userId, pattern);
      case 'actor':
        return this.filterOptionPeople(userId, 'acteur', pattern);
      case 'director':
        return this.filterOptionPeople(userId, 'realisateur', pattern);
    }
  }

  private async filterOptionTitles(userId: string, pattern: string | null): Promise<DatavizFilterOption[]> {
    const searchClause = pattern
      ? Prisma.sql`AND (t.titre_vo ILIKE ${pattern} ESCAPE '\\' OR t.titre_vf ILIKE ${pattern} ESCAPE '\\')`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ id: string; nom: string }[]>(Prisma.sql`
      SELECT t.id, COALESCE(t.titre_vf, t.titre_vo) AS nom, COUNT(*) AS cnt
      FROM user_watches uw
      LEFT JOIN episodes e ON e.id = uw.episode_id
      LEFT JOIN seasons s ON s.id = e.season_id
      JOIN titles t ON t.id = COALESCE(uw.title_id, s.title_id)
      WHERE uw.user_id = ${userId}::UUID ${searchClause}
      GROUP BY t.id, t.titre_vf, t.titre_vo
      ORDER BY cnt DESC
      LIMIT 20
    `);
    return this.toFilterOptions(rows);
  }

  private async filterOptionStudios(userId: string, pattern: string | null): Promise<DatavizFilterOption[]> {
    const searchClause = pattern ? Prisma.sql`AND st.nom ILIKE ${pattern} ESCAPE '\\'` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ id: string; nom: string }[]>(Prisma.sql`
      SELECT st.id, st.nom, COUNT(*) AS cnt
      FROM user_watches uw
      LEFT JOIN episodes e ON e.id = uw.episode_id
      LEFT JOIN seasons s ON s.id = e.season_id
      JOIN titles t ON t.id = COALESCE(uw.title_id, s.title_id)
      JOIN title_studios ts ON ts.title_id = t.id
      JOIN studios st ON st.id = ts.studio_id
      WHERE uw.user_id = ${userId}::UUID ${searchClause}
      GROUP BY st.id, st.nom
      ORDER BY cnt DESC
      LIMIT 20
    `);
    return this.toFilterOptions(rows);
  }

  private async filterOptionPeople(
    userId: string,
    roleCode: 'acteur' | 'realisateur',
    pattern: string | null,
  ): Promise<DatavizFilterOption[]> {
    const searchClause = pattern ? Prisma.sql`AND p.nom ILIKE ${pattern} ESCAPE '\\'` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ id: string; nom: string }[]>(Prisma.sql`
      SELECT p.id, p.nom, COUNT(*) AS cnt
      FROM user_watches uw
      LEFT JOIN episodes e ON e.id = uw.episode_id
      LEFT JOIN seasons s ON s.id = e.season_id
      JOIN titles t ON t.id = COALESCE(uw.title_id, s.title_id)
      JOIN (
        SELECT DISTINCT cr.title_id, cr.person_id
        FROM credits cr
        JOIN roles r ON r.id = cr.role_id AND r.code = ${roleCode}
      ) rc ON rc.title_id = t.id
      JOIN people p ON p.id = rc.person_id
      WHERE uw.user_id = ${userId}::UUID ${searchClause}
      GROUP BY p.id, p.nom
      ORDER BY cnt DESC
      LIMIT 20
    `);
    return this.toFilterOptions(rows);
  }

  /** `queryRaw` renvoie `cnt` en `BigInt` (COUNT Postgres) — non utilisé côté appelant, retiré ici. */
  private toFilterOptions(rows: { id: string; nom: string }[]): DatavizFilterOption[] {
    return rows.map((row) => ({ id: row.id, nom: row.nom }));
  }
}
