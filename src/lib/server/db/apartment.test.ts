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

function insertTravelTimes(travelTimes: string) {
  return db
    .insertInto('apartment')
    .values({ address: 'a', travelTimes, travelTimesComputedAt: new Date() })
    .execute();
}

describe('apartment', () => {
  describe('travelTimes', () => {
    test('accepts an array', async () => {
      await expect(insertTravelTimes('[]')).resolves.toBeDefined();
    });

    test('reads back keys inside it unchanged', async () => {
      const travelTimes = [{ snake_key: 1, camelKey: { nested_key: 2 } }];
      const row = await db
        .insertInto('apartment')
        .values({
          address: 'a',
          travelTimes: JSON.stringify(travelTimes),
          travelTimesComputedAt: new Date(),
        })
        .returning('travelTimes')
        .executeTakeFirstOrThrow();
      expect(row.travelTimes).toEqual(travelTimes);
    });

    test.each([
      ['an object', '{}'],
      ['an array stringified twice', JSON.stringify(JSON.stringify([]))],
    ])('rejects %s', async (_, travelTimes) => {
      await expect(insertTravelTimes(travelTimes)).rejects.toThrow(
        'apartment_travel_times_is_array',
      );
    });
  });
});
