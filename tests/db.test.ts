import { describe, expect, test } from 'vitest';
import { createTestDatabase } from './db.ts';

describe('createTestDatabase', () => {
  test('applies the migrations', async () => {
    const db = await createTestDatabase();
    const computedAt = new Date('2026-11-23T14:00:00Z');
    const results = [{ id: 'library', label: 'Library' }];

    const row = await db
      .insertInto('apartment')
      // `pg` sends a JS array as a Postgres array literal, which `jsonb` rejects, while PGlite
      // accepts either. Stringifying is the form both take, so tests can't hide the difference.
      .values({
        address: '100 Martine Ave, White Plains, NY 10601',
        results: JSON.stringify(results),
        results_computed_at: computedAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    expect(row).toEqual({
      id: 1,
      address: '100 Martine Ave, White Plains, NY 10601',
      results,
      results_computed_at: computedAt,
      created_at: expect.any(Date),
    });
    await db.destroy();
  });

  test('gives each call its own database', async () => {
    const first = await createTestDatabase();
    const second = await createTestDatabase();

    await first
      .insertInto('apartment')
      .values({ address: 'a', results: '[]', results_computed_at: new Date() })
      .execute();

    expect(await second.selectFrom('apartment').selectAll().execute()).toEqual([]);
    await Promise.all([first.destroy(), second.destroy()]);
  });
});
