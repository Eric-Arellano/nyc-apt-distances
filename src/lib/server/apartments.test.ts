import type { Kysely } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { createTestDatabase } from '#tests/db.ts';
import { getApartment } from './apartments';
import type Database from './db/schema/Database.ts';
import type { ApartmentId } from './db/schema/public/Apartment.ts';
import { DESTINATIONS, ORIGIN_COUNTY } from './destinations';
import { fakeMaps } from './fakeMaps';
import { computeTravelTimes, type TravelTimeEntry, toDestinationResults } from './travelTimes';

let db: Kysely<Database>;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db.destroy();
});

beforeEach(async () => {
  await db.deleteFrom('apartment').execute();
});

async function freshEntries(address: string): Promise<TravelTimeEntry[]> {
  const { coordinates } = await fakeMaps.geocode(address, ORIGIN_COUNTY);
  return await computeTravelTimes(address, coordinates, DESTINATIONS, fakeMaps);
}

async function insert(address: string, entries: TravelTimeEntry[], computedAt: Date) {
  const { id } = await db
    .insertInto('apartment')
    .values({
      address,
      placeId: 'a',
      travelTimes: JSON.stringify(entries),
      travelTimesComputedAt: computedAt,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return id;
}

describe('getApartment', () => {
  test('returns the stored snapshot, joined with the current destinations', async () => {
    const entries = await freshEntries('1 Main St');
    const computedAt = new Date('2026-01-02T03:04:05Z');
    const id = await insert('1 Main St', entries, computedAt);

    expect(await getApartment(db, id)).toEqual({
      id,
      address: '1 Main St',
      travelTimesComputedAt: computedAt,
      results: toDestinationResults(entries, DESTINATIONS).results,
      missing: [],
    });
  });

  test('returns nothing for an unknown id', async () => {
    expect(await getApartment(db, 404 as ApartmentId)).toBeUndefined();
  });

  describe('with a stale snapshot', () => {
    test('lists destinations whose entry is gone or whose fingerprint changed', async () => {
      const [first, , ...rest] = await freshEntries('1 Main St');
      if (!first) throw new Error('Expected at least two destinations');
      const id = await insert('1 Main St', [{ ...first, fingerprint: 'old' }, ...rest], new Date());

      const apartment = await getApartment(db, id);

      expect(apartment?.missing).toEqual([DESTINATIONS[0]?.title, DESTINATIONS[1]?.title]);
      expect(apartment?.results.map((result) => result.id)).toEqual(rest.map(({ id }) => id));
    });
  });
});
