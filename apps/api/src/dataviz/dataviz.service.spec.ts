import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DatavizService } from './dataviz.service';
import { PrismaService } from '../prisma/prisma.service';
import { WatchTimeQueryDto } from './dto/watch-time-query.dto';
import { WatchCountQueryDto } from './dto/watch-count-query.dto';

const mockPrismaService = {
  $queryRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
};

describe('DatavizService', () => {
  let service: DatavizService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatavizService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<DatavizService>(DatavizService);
    jest.clearAllMocks();
  });

  const userId = 'user-uuid';

  describe('getWatchTime', () => {
    it('retourne les données groupées par période', async () => {
      const mockData = [{ user_id: userId, periode_semaine: new Date('2024-01-01'), minutes: 120 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

      const result = await service.getWatchTime(userId, {
        groupBy: 'period',
      } as WatchTimeQueryDto);

      expect(result).toEqual(mockData);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('mv_watch_time_by_period'),
      );
    });

    it('filtre par année pour period', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.getWatchTime(userId, {
        groupBy: 'period',
        yearFrom: 2024,
        yearTo: 2025,
      } as WatchTimeQueryDto);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('EXTRACT(YEAR FROM periode_semaine) BETWEEN 2024 AND 2025'),
      );
    });

    it('retourne les données groupées par genre', async () => {
      const mockData = [{ user_id: userId, genre_id: 'genre-uuid', minutes: 200 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

      const result = await service.getWatchTime(userId, {
        groupBy: 'genre',
      } as WatchTimeQueryDto);

      expect(result).toEqual(mockData);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('mv_watch_time_by_genre'),
      );
    });

    it('filtre par année pour genre (sous-requête EXISTS)', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.getWatchTime(userId, {
        groupBy: 'genre',
        yearFrom: 2023,
      } as WatchTimeQueryDto);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS'),
      );
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN 2023 AND 2100'),
      );
    });

    it('retourne les données groupées par pays', async () => {
      const mockData = [{ user_id: userId, country_id: 'country-uuid', minutes: 150 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

      const result = await service.getWatchTime(userId, {
        groupBy: 'country',
      } as WatchTimeQueryDto);

      expect(result).toEqual(mockData);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('mv_watch_time_by_country'),
      );
    });

    it('retourne les données groupées par animation', async () => {
      const mockData = [{ user_id: userId, is_animation: true, minutes: 300 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

      const result = await service.getWatchTime(userId, {
        groupBy: 'animation',
      } as WatchTimeQueryDto);

      expect(result).toEqual(mockData);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('mv_watch_time_by_animation'),
      );
    });

    it('retourne un tableau vide si la vue est vide', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.getWatchTime(userId, {
        groupBy: 'period',
      } as WatchTimeQueryDto);

      expect(result).toEqual([]);
    });
  });

  describe('getWatchCount', () => {
    it('retourne les données groupées par période', async () => {
      const mockData = [{ user_id: userId, periode_semaine: new Date('2024-01-01'), nb_items: 5 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

      const result = await service.getWatchCount(userId, {
        groupBy: 'period',
      } as WatchCountQueryDto);

      expect(result).toEqual(mockData);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('mv_watch_count_by_period'),
      );
    });

    it('filtre par année pour period', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.getWatchCount(userId, {
        groupBy: 'period',
        yearTo: 2024,
      } as WatchCountQueryDto);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('EXTRACT(YEAR FROM periode_semaine) BETWEEN 1900 AND 2024'),
      );
    });

    it('retourne les données groupées par genre', async () => {
      const mockData = [{ user_id: userId, genre_id: 'genre-uuid', nb_items: 10 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

      const result = await service.getWatchCount(userId, {
        groupBy: 'genre',
      } as WatchCountQueryDto);

      expect(result).toEqual(mockData);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('mv_watch_count_by_genre'),
      );
    });

    it('retourne les données groupées par pays', async () => {
      const mockData = [{ user_id: userId, country_id: 'country-uuid', nb_items: 3 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

      const result = await service.getWatchCount(userId, {
        groupBy: 'country',
      } as WatchCountQueryDto);

      expect(result).toEqual(mockData);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('mv_watch_count_by_country'),
      );
    });

    it('retourne les données groupées par animation', async () => {
      const mockData = [{ user_id: userId, is_animation: false, nb_items: 7 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

      const result = await service.getWatchCount(userId, {
        groupBy: 'animation',
      } as WatchCountQueryDto);

      expect(result).toEqual(mockData);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('mv_watch_count_by_animation'),
      );
    });

    it('retourne un tableau vide si la vue est vide', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.getWatchCount(userId, {
        groupBy: 'country',
      } as WatchCountQueryDto);

      expect(result).toEqual([]);
    });
  });

  describe('sécurité ORDER BY', () => {
    it("n'ajoute que les colonnes autorisées dans le ORDER BY", async () => {
      const mockService = service as any;

      expect(mockService.orderBy('periode_semaine')).toBe(' ORDER BY periode_semaine');
      expect(mockService.orderBy('genre_id')).toBe(' ORDER BY genre_id');
      expect(mockService.orderBy('country_id')).toBe(' ORDER BY country_id');
      expect(mockService.orderBy('is_animation')).toBe(' ORDER BY is_animation');
      expect(mockService.orderBy('invalid_col; DROP TABLE users;')).toBe('');
    });
  });

  describe('sérialisation BigInt (bug #54)', () => {
    // SUM()/COUNT(*) sur les vues matérialisées reviennent en `bigint` JS
    // depuis le driver Postgres — JSON.stringify (réponse Express) ne sait
    // pas les sérialiser et faisait échouer tous les endpoints dataviz en
    // 500 avant ce correctif.
    it('convertit les colonnes bigint (minutes, nb_items) en Number', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([
        { user_id: userId, periode_semaine: new Date('2024-01-01'), minutes: 120n },
      ]);

      const result = await service.getWatchTime(userId, {
        groupBy: 'period',
      } as WatchTimeQueryDto);

      expect(result).toEqual([
        { user_id: userId, periode_semaine: new Date('2024-01-01'), minutes: 120 },
      ]);
      expect(typeof (result[0] as any).minutes).toBe('number');
    });

    it('convertit nb_items (COUNT) en Number', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([
        { user_id: userId, genre_id: 'genre-uuid', nb_items: 7n },
      ]);

      const result = await service.getWatchCount(userId, {
        groupBy: 'genre',
      } as WatchCountQueryDto);

      expect(typeof (result[0] as any).nb_items).toBe('number');
      expect((result[0] as any).nb_items).toBe(7);
    });
  });

  // GET /dataviz/query — menu unifié métrique/agrégation/groupement/filtres
  // (modification W, 8ème passe), remplace summary/breakdown/by-year.
  describe('query (modification W, menu unifié)', () => {
    const base = { metric: 'duration', aggregation: 'sum', groupBy: 'none' } as const;

    it('groupBy=none : une seule requête SQL, total=null', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([
        { category_id: null, category: 'Total', value: 451n },
      ]);

      const result = await service.query(userId, base as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ total: null, rows: [{ category_id: null, category: 'Total', value: 451 }] });
    });

    it("groupBy != none : deux requêtes (répartition + total via groupBy forcé à 'none')", async () => {
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([{ category_id: 'g1', category: 'Action', value: 100n }])
        .mockResolvedValueOnce([{ category_id: null, category: 'Total', value: 451n }]);

      const result = await service.query(userId, { ...base, groupBy: 'genre' } as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledTimes(2);
      expect(result.rows).toEqual([{ category_id: 'g1', category: 'Action', value: 100 }]);
      expect(result.total).toBe(451);
      // La 2ème requête (total) ne doit pas joindre title_genres — groupBy forcé à 'none'.
      const totalSql = mockPrismaService.$queryRawUnsafe.mock.calls[1][0] as string;
      expect(totalSql).not.toContain('title_genres');
    });

    it("convertit les 'value' NUMERIC renvoyées en chaîne par pg (AVG/ROUND/note_imdb) en Number", async () => {
      // AVG()/ROUND() et les colonnes DECIMAL (note_imdb) reviennent en
      // NUMERIC PostgreSQL, que le driver pg renvoie en chaîne par défaut
      // (pas en Number, contrairement au bigint déjà géré par queryRaw) —
      // sans conversion, le frontend plante sur value.toFixed(...).
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([
        { category_id: null, category: 'Total', value: '6.45' },
      ]);

      const result = await service.query(userId, { metric: 'note', aggregation: 'avg', groupBy: 'none' } as any);

      expect(result.rows).toEqual([{ category_id: null, category: 'Total', value: 6.45 }]);
      expect(typeof result.rows[0].value).toBe('number');
    });

    it("préserve 'value' = null (évolution sans période précédente) sans le coercer en 0", async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ category_id: null, category: 'Total', value: null }]);

      const result = await service.query(userId, { metric: 'duration', aggregation: 'evolution', groupBy: 'none' } as any);

      expect(result.rows).toEqual([{ category_id: null, category: 'Total', value: null }]);
    });

    describe('legendBy ("Légende", 2ème axe de répartition)', () => {
      it('groupBy=genre + legendBy=mediaType : jointure genre + colonnes series_id/series alignées sur t.type', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'genre', legendBy: 'mediaType' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain('JOIN title_genres tg ON tg.title_id = t.id');
        expect(sql).toContain("(CASE WHEN t.type = 'film' THEN 'Film' ELSE 'Série' END) AS series");
        expect(sql).toContain('GROUP BY g.id, g.nom, t.type');
      });

      it('groupBy=genre + legendBy=genre (même groupement des deux côtés) : alias distincts, sans collision', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'genre', legendBy: 'genre' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain('JOIN title_genres tg ON tg.title_id = t.id JOIN genres g ON g.id = tg.genre_id');
        expect(sql).toContain('JOIN title_genres tg2 ON tg2.title_id = t.id JOIN genres g2 ON g2.id = tg2.genre_id');
        expect(sql).toContain('g2.id::TEXT AS series_id, g2.nom AS series');
      });

      it('legendBy=none (ou absent) : aucune colonne series ajoutée', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'genre', legendBy: 'none' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).not.toContain('AS series');
      });

      it('groupBy=studio + legendBy=country : légende non-mediaType ignorée pour top 20 (aucune colonne series)', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'studio', legendBy: 'country' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).not.toContain('AS series');
        expect(sql).not.toContain('title_countries');
      });

      it("ignoré pour evolution/note+avg/watches+titres restreint (n'ajoute aucune colonne series)", async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { metric: 'duration', aggregation: 'evolution', groupBy: 'genre', legendBy: 'country' } as any);
        let sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).not.toContain('AS series');

        jest.clearAllMocks();
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);
        await service.query(userId, { metric: 'note', aggregation: 'avg', groupBy: 'genre', legendBy: 'country' } as any);
        sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).not.toContain('AS series');

        jest.clearAllMocks();
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);
        await service.query(userId, { metric: 'watches', aggregation: 'avg', groupBy: 'none', legendBy: 'country' } as any);
        sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).not.toContain('AS series');
      });
    });

    describe('groupements contexte de visionnage (support/compagnie/émotion)', () => {
      it('groupBy=support : colonne directe uw.support, filtre IS NOT NULL, libellés français', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'support' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain('ON uw.support IS NOT NULL');
        expect(sql).toContain("WHEN 'cinema' THEN 'Cinéma'");
        expect(sql).toContain('GROUP BY uw.support');
      });

      it('groupBy=compagnie : colonne directe uw.compagnie, filtre IS NOT NULL', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'compagnie' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain('ON uw.compagnie IS NOT NULL');
        expect(sql).toContain("WHEN 'accompagne' THEN 'Accompagné'");
        expect(sql).toContain('GROUP BY uw.compagnie');
      });

      it('groupBy=emotion : UNNEST fait le fan-out (un visionnage à plusieurs émotions compte dans chacune)', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'emotion' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain('CROSS JOIN LATERAL UNNEST(uw.emotion) AS em(value)');
        expect(sql).toContain("WHEN 'emu' THEN 'Ému'");
        expect(sql).toContain('GROUP BY em.value');
      });

      it('groupBy=genre + legendBy=emotion : les deux jointures coexistent avec des alias distincts', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'genre', legendBy: 'emotion' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain('JOIN title_genres tg ON tg.title_id = t.id');
        expect(sql).toContain('CROSS JOIN LATERAL UNNEST(uw.emotion) AS em2(value)');
        expect(sql).toContain('GROUP BY g.id, g.nom, em2.value');
      });
    });

    it('groupBy=genre : jointure title_genres/genres', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { ...base, groupBy: 'genre' } as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('JOIN title_genres tg ON tg.title_id = t.id'),
      );
    });

    it('groupBy=country : jointure title_countries/countries', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { ...base, groupBy: 'country' } as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('JOIN title_countries tc ON tc.title_id = t.id'),
      );
    });

    it('groupBy=period : date_trunc sur la granularité demandée (défaut month)', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { ...base, groupBy: 'period' } as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("date_trunc('month', uw.date_vue)"),
      );
    });

    it('groupBy=mediaType : catégories Film/Série, group par t.type', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { ...base, groupBy: 'mediaType' } as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("CASE WHEN t.type = 'film' THEN 'Film' ELSE 'Série' END"),
      );
    });

    it('groupBy=studio : traité comme top 20 (jointure title_studios/studios, trié par valeur, plafonné à 20)', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([
        { category_id: 'studio-uuid', category: 'Big Studio', value: 200n },
      ]);

      const result = await service.query(userId, { ...base, groupBy: 'studio' } as any);

      const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('JOIN title_studios ts ON ts.title_id = t.id');
      expect(sql).toContain('JOIN studios st ON st.id = ts.studio_id');
      expect(sql).toContain('ORDER BY value DESC');
      expect(sql).toContain('LIMIT 20');
      expect(result.rows).toEqual([{ category_id: 'studio-uuid', category: 'Big Studio', value: 200 }]);
    });

    it('metric=duration : sum/min/max/avg sur la durée', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { ...base, aggregation: 'min' } as any);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('MIN(COALESCE(e.duree_minutes, t.duree_minutes, 0))'),
      );

      await service.query(userId, { ...base, aggregation: 'avg' } as any);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('AVG(COALESCE(e.duree_minutes, t.duree_minutes, 0))'),
      );
    });

    it('metric=watches : count = COUNT(*), distinctCount = COUNT(DISTINCT t.id)', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { metric: 'watches', aggregation: 'count', groupBy: 'none' } as any);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('COUNT(*) AS value'));

      await service.query(userId, { metric: 'watches', aggregation: 'distinctCount', groupBy: 'none' } as any);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT t.id) AS value'),
      );
    });

    it('metric=titles : count et distinctCount identiques (COUNT(DISTINCT t.id))', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { metric: 'titles', aggregation: 'count', groupBy: 'none' } as any);
      const countSql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;

      jest.clearAllMocks();
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);
      await service.query(userId, { metric: 'titles', aggregation: 'distinctCount', groupBy: 'none' } as any);
      const distinctCountSql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;

      expect(countSql).toContain('COUNT(DISTINCT t.id) AS value');
      expect(distinctCountSql).toContain('COUNT(DISTINCT t.id) AS value');
    });

    it('metric=note : count/min/max directement sur ur.note_perso', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { metric: 'note', aggregation: 'max', groupBy: 'none' } as any);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('MAX(ur.note_perso) AS value'),
      );
    });

    it('metric=note, aggregation=avg : dédoublonné par titre avant la moyenne', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { metric: 'note', aggregation: 'avg', groupBy: 'none' } as any);

      const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('SELECT DISTINCT');
      expect(sql).toContain('AVG(note_perso) AS value');
    });

    it('watches/titles + min/max/avg : groupement ignoré, bucketé par période puis agrégé (ex Stats perso)', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ value: 12n }]);

      const result = await service.query(userId, {
        metric: 'watches',
        aggregation: 'avg',
        groupBy: 'genre',
      } as any);

      const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).not.toContain('title_genres');
      expect(sql).toContain('WITH buckets AS');
      expect(sql).toContain('AVG(cnt) AS value');
      // groupBy est ignoré par ce chemin (bucketé par période, pas par catégorie) : le
      // "total" (recalculé avec groupBy forcé à 'none') retombe donc sur la même valeur.
      expect(result.total).toBe(12);
      expect(result.rows).toEqual([{ category_id: null, category: 'Total', value: 12 }]);
    });

    it('watches/titles + evolution : compare les 2 derniers buckets de période, % arrondi', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ value: 19.4 }]);

      const result = await service.query(userId, {
        metric: 'titles',
        aggregation: 'evolution',
        groupBy: 'none',
      } as any);

      const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('ROW_NUMBER() OVER (ORDER BY bucket DESC)');
      expect(result.rows).toEqual([{ category_id: null, category: 'Total', value: 19.4 }]);
    });

    it('duration/note + evolution : évolution par catégorie via fenêtrage (PARTITION BY)', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([
        { category_id: 'g1', category: 'Action', value: 12.5 },
      ]);

      const result = await service.query(userId, {
        metric: 'duration',
        aggregation: 'evolution',
        groupBy: 'genre',
      } as any);

      const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('PARTITION BY category_id, category ORDER BY bucket DESC');
      expect(sql).toContain('JOIN title_genres tg ON tg.title_id = t.id');
      expect(result.rows).toEqual([{ category_id: 'g1', category: 'Action', value: 12.5 }]);
    });

    it('filtre mediaType (distinct du groupement) : AND t.type = \'film\'', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { ...base, mediaType: 'film' } as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("AND t.type = 'film'"),
      );
    });

    it('filtre "Année de visionnage" (watchedYearMin/Max)', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { ...base, watchedYearMin: 2023, watchedYearMax: 2025 } as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('AND EXTRACT(YEAR FROM uw.date_vue) BETWEEN 2023 AND 2025'),
      );
    });

    it('filtre studioIds (nouveau, distinct du groupement studio) : EXISTS sur title_studios', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, { ...base, studioIds: ['studio-1'] } as any);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          "EXISTS (SELECT 1 FROM title_studios tsf WHERE tsf.title_id = t.id AND tsf.studio_id IN ('studio-1'::UUID))",
        ),
      );
    });

    it('filtres genre/pays/listes/année de sortie/note IMDB (hérités de DatavizFilterQueryDto)', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.query(userId, {
        ...base,
        genreIds: ['genre-1'],
        countryIds: ['country-1'],
        listIds: ['list-1'],
        releaseYearMin: 2000,
        noteImdbMax: 9,
      } as any);

      const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain("EXISTS (SELECT 1 FROM title_genres tgf WHERE tgf.title_id = t.id AND tgf.genre_id IN ('genre-1'::UUID))");
      expect(sql).toContain("EXISTS (SELECT 1 FROM title_countries tcf WHERE tcf.title_id = t.id AND tcf.country_id IN ('country-1'::UUID))");
      expect(sql).toContain("EXISTS (SELECT 1 FROM list_items lif WHERE lif.title_id = t.id AND lif.list_id IN ('list-1'::UUID))");
      expect(sql).toContain('EXTRACT(YEAR FROM t.date_sortie) >= 2000');
      expect(sql).toContain('t.note_imdb <= 9');
    });

    describe('groupBy top20 (title/actor/director)', () => {
      it('groupBy=title : pas de jointure supplémentaire (t déjà en scope), trié par valeur, plafonné à 20', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'title' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain('COALESCE(t.titre_vf, t.titre_vo)');
        expect(sql).toContain('ORDER BY value DESC');
        expect(sql).toContain('LIMIT 20');
      });

      it('groupBy=actor : jointure credits/roles (code=acteur) dédupliquée par (title_id, person_id)', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'actor' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain('SELECT DISTINCT cr.title_id, cr.person_id');
        expect(sql).toContain("r.code = 'acteur'");
        expect(sql).toContain('JOIN people p');
        expect(sql).toContain('ORDER BY value DESC');
        expect(sql).toContain('LIMIT 20');
      });

      it('groupBy=director : même jointure que acteur, code=realisateur', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, groupBy: 'director' } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain("r.code = 'realisateur'");
      });

      it('watches/titles + count/distinctCount + groupBy=actor : combinaison valide, aucune exception', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await expect(
          service.query(userId, { metric: 'titles', aggregation: 'distinctCount', groupBy: 'director' } as any),
        ).resolves.toBeDefined();
      });

      it('groupBy=director + legendBy=mediaType : colonnes series_id/series alignées sur t.type, GROUP BY étendu', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, {
          metric: 'titles',
          aggregation: 'distinctCount',
          groupBy: 'director',
          legendBy: 'mediaType',
        } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain("(CASE WHEN t.type = 'film' THEN 'Film' ELSE 'Série' END) AS series");
        expect(sql).toContain('GROUP BY p.id, p.nom, t.type');
        expect(sql).toContain('ORDER BY value DESC, t.type');
        expect(sql).toContain('LIMIT 20');
      });

      it('groupBy=actor + legendBy=mediaType : même mécanisme, jointure acteur + légende film/série', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, {
          metric: 'titles',
          aggregation: 'distinctCount',
          groupBy: 'actor',
          legendBy: 'mediaType',
        } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain("r.code = 'acteur'");
        expect(sql).toContain("(CASE WHEN t.type = 'film' THEN 'Film' ELSE 'Série' END) AS series");
        expect(sql).toContain('GROUP BY p.id, p.nom, t.type');
      });

      it('groupBy=director + legendBy=genre : légende non-mediaType ignorée pour top 20 (aucune colonne series)', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, {
          metric: 'titles',
          aggregation: 'distinctCount',
          groupBy: 'director',
          legendBy: 'genre',
        } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).not.toContain('AS series');
        expect(sql).not.toContain('title_genres');
      });

      it('metric=note + groupBy=title : rejeté (top20 restreint à duration/watches/titles)', async () => {
        await expect(
          service.query(userId, { metric: 'note', aggregation: 'avg', groupBy: 'title' } as any),
        ).rejects.toThrow(BadRequestException);
      });

      it('metric=duration + aggregation=evolution + groupBy=actor : rejeté (top20 restreint à sum)', async () => {
        await expect(
          service.query(userId, { metric: 'duration', aggregation: 'evolution', groupBy: 'actor' } as any),
        ).rejects.toThrow(BadRequestException);
      });

      it('filtre titleIds : AND t.id IN (...)', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, titleIds: ['title-1'] } as any);

        expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
          expect.stringContaining("AND t.id IN ('title-1'::UUID)"),
        );
      });

      it('filtre actorIds : EXISTS sur credits/roles (code=acteur)', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, actorIds: ['person-1'] } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain("rf.code = 'acteur'");
        expect(sql).toContain("crf.person_id IN ('person-1'::UUID)");
      });

      it('filtre directorIds : EXISTS sur credits/roles (code=realisateur)', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await service.query(userId, { ...base, directorIds: ['person-2'] } as any);

        const sql = mockPrismaService.$queryRawUnsafe.mock.calls[0][0] as string;
        expect(sql).toContain("rf.code = 'realisateur'");
        expect(sql).toContain("crf.person_id IN ('person-2'::UUID)");
      });
    });
  });

  describe('getFilterOptions (dropdowns Titre/Acteur/Réalisateur/Studio)', () => {
    it("kind='title', sans q : top 20 par nombre de visionnages, sans clause de recherche", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ id: 't1', nom: 'The Matrix', cnt: 5n }]);

      const result = await service.getFilterOptions(userId, 'title');

      expect(result).toEqual([{ id: 't1', nom: 'The Matrix' }]);
      const calledWith = mockPrismaService.$queryRaw.mock.calls[0][0];
      expect(calledWith.sql).toContain('COALESCE(t.titre_vf, t.titre_vo) AS nom');
      expect(calledWith.sql).toContain('ORDER BY cnt DESC');
      expect(calledWith.sql).toContain('LIMIT 20');
      expect(calledWith.sql).not.toContain('ILIKE');
      expect(calledWith.values).toContain(userId);
    });

    it("kind='title', avec q : recherche ILIKE paramétrée (jamais interpolée dans le texte SQL)", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getFilterOptions(userId, 'title', 'matrix');

      const calledWith = mockPrismaService.$queryRaw.mock.calls[0][0];
      expect(calledWith.sql).toContain('ILIKE');
      expect(calledWith.sql).not.toContain('matrix');
      expect(calledWith.values).toContain('%matrix%');
    });

    it("échappe les caractères spéciaux LIKE (%, _) dans le texte de recherche", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getFilterOptions(userId, 'title', '50%_off');

      const calledWith = mockPrismaService.$queryRaw.mock.calls[0][0];
      expect(calledWith.values).toContain('%50\\%\\_off%');
    });

    it("kind='actor' : jointure credits/roles (code=acteur) dédupliquée, scope aux entités déjà regardées", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getFilterOptions(userId, 'actor', 'keanu');

      const calledWith = mockPrismaService.$queryRaw.mock.calls[0][0];
      expect(calledWith.sql).toContain('SELECT DISTINCT cr.title_id, cr.person_id');
      expect(calledWith.values).toContain('acteur');
      expect(calledWith.values).toContain('%keanu%');
    });

    it("kind='director' : même jointure, code=realisateur", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getFilterOptions(userId, 'director');

      const calledWith = mockPrismaService.$queryRaw.mock.calls[0][0];
      expect(calledWith.values).toContain('realisateur');
    });

    it("kind='studio' : jointure title_studios/studios", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getFilterOptions(userId, 'studio');

      const calledWith = mockPrismaService.$queryRaw.mock.calls[0][0];
      expect(calledWith.sql).toContain('JOIN title_studios ts ON ts.title_id = t.id');
      expect(calledWith.sql).toContain('JOIN studios st ON st.id = ts.studio_id');
    });
  });
});
