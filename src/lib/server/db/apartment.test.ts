import type { Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createTestDatabase } from '#tests/db.ts';
import type Database from './schema/Database.ts';

let db: Kysely<Database>;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db.destroy();
});

function insertResults(results: string) {
  return db
    .insertInto('apartment')
    .values({ address: 'a', results, resultsComputedAt: new Date() })
    .execute();
}

describe('apartment', () => {
  describe('results', () => {
    test('accepts an array', async () => {
      await expect(insertResults('[]')).resolves.toBeDefined();
    });

    test('reads back keys inside it unchanged', async () => {
      const results = [{ snake_key: 1, camelKey: { nested_key: 2 } }];
      const row = await db
        .insertInto('apartment')
        .values({ address: 'a', results: JSON.stringify(results), resultsComputedAt: new Date() })
        .returning('results')
        .executeTakeFirstOrThrow();
      expect(row.results).toEqual(results);
    });

    test.each([
      ['an object', '{}'],
      ['an array stringified twice', JSON.stringify(JSON.stringify([]))],
    ])('rejects %s', async (_, results) => {
      await expect(insertResults(results)).rejects.toThrow('apartment_results_is_array');
    });
  });
});
