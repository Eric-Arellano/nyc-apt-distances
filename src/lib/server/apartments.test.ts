import type { Kysely } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestDatabase } from '#tests/db.ts';
import bike from '#tests/fixtures/google/bike.json';
import drive from '#tests/fixtures/google/drive.json';
import geocode from '#tests/fixtures/google/geocode.json';
import geocodeZeroResults from '#tests/fixtures/google/geocode-zero-results.json';
import transit from '#tests/fixtures/google/transit-transfer.json';
import walk from '#tests/fixtures/google/walk.json';
import {
  deleteApartment,
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
import { googleMaps } from './maps';
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

const ROUTE_FIXTURES: Record<string, unknown> = {
  WALK: walk,
  BICYCLE: bike,
  TRANSIT: transit,
  DRIVE: drive,
};

async function fakeGoogle(url: URL | string, init?: RequestInit) {
  if (String(url).includes('geocode')) return Response.json(geocode);
  const { travelMode } = JSON.parse(String(init?.body));
  return Response.json(ROUTE_FIXTURES[travelMode]);
}

function spyMaps() {
  return { geocode: vi.fn(fakeMaps.geocode), computeRoute: vi.fn(fakeMaps.computeRoute) };
}

async function save(address: string, allowDuplicate = false): Promise<ApartmentId> {
  const outcome = await saveApartment(db, fakeMaps, address, { allowDuplicate });
  if (outcome.kind !== 'saved') throw new Error(`Expected a save, got ${outcome.kind}`);
  return outcome.id;
}

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

describe('saveApartment', () => {
  test('stores the address and an entry per destination', async () => {
    const id = await save('1 Main St');

    expect(await getApartment(db, id)).toEqual({
      id,
      address: '1 Main St',
      travelTimesComputedAt: expect.any(Date),
      results: toDestinationResults(await freshEntries('1 Main St'), DESTINATIONS).results,
      missing: [],
    });
  });

  describe('with Google', () => {
    const GOOGLE = googleMaps('test-key');

    test('stores what Google answers', async () => {
      const fetchMock = vi.fn(fakeGoogle);
      vi.stubGlobal('fetch', fetchMock);

      const outcome = await saveApartment(db, GOOGLE, '1 Main St', { allowDuplicate: false });

      expect(outcome).toEqual({ kind: 'saved', id: expect.any(Number) });
      expect(fetchMock).toHaveBeenCalled();
    });

    test('refuses an address Google cannot find, saving nothing', async () => {
      vi.stubGlobal('fetch', async () => Response.json(geocodeZeroResults));

      await expect(saveApartment(db, GOOGLE, 'nowhere', { allowDuplicate: false })).rejects.toEqual(
        {
          status: 400,
          body: { message: 'Google could not find that address.', status: 400 },
        },
      );
      expect(await listApartments(db)).toEqual([]);
    });
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

      expect((await listApartments(db)).map(({ id }) => id)).toEqual([second, first]);
    });
  });
});

describe('recomputeApartment', () => {
  test('replaces the whole snapshot and its compute time', async () => {
    const longAgo = new Date('2025-01-01T00:00:00Z');
    const id = await insert('1 Main St', [], longAgo);

    await recomputeApartment(db, fakeMaps, id);

    const apartment = await getApartment(db, id);
    expect(apartment?.missing).toEqual([]);
    expect(apartment?.results).toEqual(
      toDestinationResults(await freshEntries('1 Main St'), DESTINATIONS).results,
    );
    expect(apartment?.travelTimesComputedAt.getTime()).toBeGreaterThan(longAgo.getTime());
  });

  test('refuses an unknown id with a 404', async () => {
    await expect(recomputeApartment(db, fakeMaps, 404 as ApartmentId)).rejects.toEqual({
      status: 404,
      body: { message: 'No saved apartment has that link.', status: 404 },
    });
  });
});

describe('deleteApartment', () => {
  test('deletes only that apartment', async () => {
    const kept = await save('1 Main St');
    const deleted = await save('2 Main St');

    await deleteApartment(db, deleted);

    expect((await listApartments(db)).map(({ id }) => id)).toEqual([kept]);
  });

  test('succeeds for an apartment already deleted', async () => {
    const id = await save('1 Main St');
    await deleteApartment(db, id);

    await expect(deleteApartment(db, id)).resolves.toBeUndefined();
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

  test('is empty with nothing saved', async () => {
    expect(await listApartments(db)).toEqual([]);
  });
});
