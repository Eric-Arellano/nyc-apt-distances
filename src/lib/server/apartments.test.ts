import type { Kysely } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestDatabase } from '#tests/db.ts';
import {
  getApartment,
  listApartments,
  recomputeApartment,
  type SaveOutcome,
  saveApartment,
} from './apartments';
import type Database from './db/schema/Database.ts';
import type { ApartmentId } from './db/schema/public/Apartment.ts';
import { DESTINATIONS, ORIGIN_COUNTY } from './destinations';
import { fakeMaps } from './fakeMaps';

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

function spyMaps() {
  return { geocode: vi.fn(fakeMaps.geocode), computeRoute: vi.fn(fakeMaps.computeRoute) };
}

async function save(address: string, allowDuplicate = false): Promise<ApartmentId> {
  const outcome = await saveApartment(db, fakeMaps, address, { allowDuplicate });
  if (outcome.kind !== 'saved') throw new Error(`Expected a save, got ${outcome.kind}`);
  return outcome.id;
}

async function storedEntries(id: ApartmentId) {
  const { travelTimes } = await db
    .selectFrom('apartment')
    .select('travelTimes')
    .where('id', '=', id)
    .executeTakeFirstOrThrow();
  return travelTimes as { id: string; fingerprint: string }[];
}

async function setEntries(id: ApartmentId, entries: unknown[], computedAt = new Date()) {
  await db
    .updateTable('apartment')
    .set({ travelTimes: JSON.stringify(entries), travelTimesComputedAt: computedAt })
    .where('id', '=', id)
    .execute();
}

describe('saveApartment', () => {
  test('stores the address and an entry per destination', async () => {
    const id = await save('1 Main St');

    expect(await getApartment(db, id)).toEqual({
      id,
      address: '1 Main St',
      travelTimesComputedAt: expect.any(Date),
      results: expect.any(Array),
      missing: [],
    });
    expect((await storedEntries(id)).map((entry) => entry.id)).toEqual(
      DESTINATIONS.map((destination) => destination.id),
    );
  });

  describe('for a place already saved', () => {
    test('returns the saved apartment after one geocode and no routes', async () => {
      const id = await save('1 Main St');
      const maps = spyMaps();

      const outcome = await saveApartment(db, maps, '1 main st ', { allowDuplicate: false });

      expect(outcome).toEqual({
        kind: 'duplicate',
        existing: { id, address: '1 Main St', createdAt: expect.any(Date) },
      } satisfies SaveOutcome);
      expect(maps.geocode).toHaveBeenCalledExactlyOnceWith('1 main st ', ORIGIN_COUNTY);
      expect(maps.computeRoute).not.toHaveBeenCalled();
    });

    test('saves a second apartment when asked to', async () => {
      const first = await save('1 Main St');

      const second = await save('1 Main St', true);

      expect(second).not.toBe(first);
      expect((await listApartments(db)).map(({ id }) => id)).toEqual([second, first]);
    });
  });
});

describe('getApartment', () => {
  test('returns nothing for an unknown id', async () => {
    expect(await getApartment(db, 404 as ApartmentId)).toBeUndefined();
  });

  describe('with a stale snapshot', () => {
    test('lists destinations whose entry is gone or whose fingerprint changed', async () => {
      const id = await save('1 Main St');
      const [first, , ...rest] = await storedEntries(id);
      await setEntries(id, [{ ...first, fingerprint: 'old' }, ...rest]);

      const apartment = await getApartment(db, id);

      expect(apartment?.missing).toEqual([DESTINATIONS[0]?.title, DESTINATIONS[1]?.title]);
      expect(apartment?.results.map((result) => result.id)).toEqual(rest.map(({ id }) => id));
    });
  });
});

describe('recomputeApartment', () => {
  test('replaces the whole snapshot and its compute time', async () => {
    const id = await save('1 Main St');
    const longAgo = new Date('2025-01-01T00:00:00Z');
    await setEntries(id, [], longAgo);

    await recomputeApartment(db, fakeMaps, id);

    const apartment = await getApartment(db, id);
    expect(apartment?.missing).toEqual([]);
    expect(apartment?.results).toHaveLength(DESTINATIONS.length);
    expect(apartment?.travelTimesComputedAt.getTime()).toBeGreaterThan(longAgo.getTime());
  });

  test('refuses an unknown id with a 404', async () => {
    await expect(recomputeApartment(db, fakeMaps, 404 as ApartmentId)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('listApartments', () => {
  test('lists the newest first', async () => {
    const first = await save('1 Main St');
    const second = await save('2 Main St');

    expect(await listApartments(db)).toEqual([
      { id: second, address: '2 Main St', createdAt: expect.any(Date) },
      { id: first, address: '1 Main St', createdAt: expect.any(Date) },
    ]);
  });
});
