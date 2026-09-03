import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListTitlesFilterDto } from './list-titles-filter.dto';

/**
 * Les query params HTTP arrivent toujours en string ("limit=10", jamais un
 * nombre) — sans `@Type(() => Number)`, `@IsInt()` échoue sur cette string
 * brute (ValidationPipe globale : whitelist + transform, sans
 * enableImplicitConversion, cf. main.ts). Bug reproduit en prod :
 * GET /titles?limit=10 renvoyait 400 sur tout appelant passant limit/page/
 * note_imdb_min explicitement, alors que le DTO "semblait" correct en
 * l'utilisant directement avec de vrais nombres JS (titles.service.spec.ts).
 */
describe('ListTitlesFilterDto (validation depuis des query params bruts)', () => {
  async function validateQuery(query: Record<string, string>) {
    const instance = plainToInstance(ListTitlesFilterDto, query);
    return validate(instance);
  }

  it('accepte limit/page/note_imdb_min envoyés comme strings (query réelle)', async () => {
    const errors = await validateQuery({
      limit: '10',
      page: '2',
      sort_by: 'note_imdb',
      sort_order: 'desc',
      note_imdb_min: '7',
    });
    expect(errors).toEqual([]);
  });

  it('rejette toujours une valeur non numérique', async () => {
    const errors = await validateQuery({ limit: 'abc' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('rejette une limite hors bornes (>100)', async () => {
    const errors = await validateQuery({ limit: '500' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });
});
