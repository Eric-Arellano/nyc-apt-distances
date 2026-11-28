import type { Kysely } from 'kysely';
import * as v from 'valibot';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { type ApartmentDetails, ApartmentDetailsSchema } from '#lib/apartmentDetails.ts';
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
  listApartmentChoices,
  listApartments,
  recomputeApartment,
  type SaveOutcome,
  saveApartment,
  setApartmentStatus,
  updateApartmentDetails,
} from './apartments.ts';
import type Database from './db/schema/Database.ts';
import type { ApartmentId } from './db/schema/public/Apartment.ts';
import { DESTINATIONS, ORIGIN_COUNTY } from './destinations.ts';
import { fakeMaps } from './fakeMaps.ts';
import { googleMaps } from './maps.ts';
import { computeTravelTimes, type TravelTimeEntry, toDestinationResults } from './travelTimes.ts';

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

const NO_DETAILS: ApartmentDetails = {
  unit: null,
  rent: null,
  listingUrl: null,
  nextStep: null,
  agentContact: null,
  notes: null,
};

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

async function save(
  address: string,
  { unit = null, allowDuplicate = false }: { unit?: string | null; allowDuplicate?: boolean } = {},
): Promise<ApartmentId> {
  const outcome = await saveApartment(db, fakeMaps, { address, unit, allowDuplicate });
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
      status: 'interested',
      details: NO_DETAILS,
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
      status: 'interested',
      details: NO_DETAILS,
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

      const outcome = await saveApartment(db, GOOGLE, {
        address: '1 Main St',
        unit: null,
        allowDuplicate: false,
      });

      expect(outcome).toEqual({ kind: 'saved', id: expect.any(Number) });
      expect(fetchMock).toHaveBeenCalled();
    });

    test('refuses an address Google cannot find, saving nothing', async () => {
      vi.stubGlobal('fetch', async () => Response.json(geocodeZeroResults));

      const saving = saveApartment(db, GOOGLE, {
        address: 'nowhere',
        unit: null,
        allowDuplicate: false,
      });

      await expect(saving).rejects.toEqual({
        status: 400,
        body: { message: 'Google could not find that address.', status: 400 },
      });
      expect(await listApartments(db)).toEqual([]);
    });
  });

  describe('for a place already saved', () => {
    test('returns the saved apartment after one geocode and no routes', async () => {
      const id = await save('1 Main St');
      const maps = spyMaps();

      const outcome = await saveApartment(db, maps, {
        address: '1 main st ',
        unit: null,
        allowDuplicate: false,
      });

      expect(outcome).toEqual({
        kind: 'duplicate',
        existing: [{ id, address: '1 Main St', unit: null, createdAt: expect.any(Date) }],
      } satisfies SaveOutcome);
      expect(maps.geocode).toHaveBeenCalledExactlyOnceWith('1 main st ', ORIGIN_COUNTY);
      expect(maps.computeRoute).not.toHaveBeenCalled();
    });

    test('saves a second apartment when asked to', async () => {
      const first = await save('1 Main St');

      const second = await save('1 Main St', { allowDuplicate: true });

      expect((await listApartments(db)).map(({ id }) => id)).toEqual([second, first]);
    });

    test('saves another unit without asking', async () => {
      await save('1 Main St', { unit: '4B' });

      const second = await save('1 Main St', { unit: '5A' });

      expect((await getApartment(db, second))?.details.unit).toBe('5A');
    });

    test("copies the building's travel times rather than routing again", async () => {
      const first = await save('1 Main St', { unit: '4B' });
      const maps = spyMaps();

      const outcome = await saveApartment(db, maps, {
        address: '1 Main St',
        unit: '5A',
        allowDuplicate: false,
      });

      if (outcome.kind !== 'saved') throw new Error(`Expected a save, got ${outcome.kind}`);
      const [copy, original] = await Promise.all([
        getApartment(db, outcome.id),
        getApartment(db, first),
      ]);
      expect(copy?.travelTimesComputedAt).toEqual(original?.travelTimesComputedAt);
      expect(copy?.results).toEqual(original?.results);
      expect(maps.computeRoute).not.toHaveBeenCalled();
    });

    test.each([
      ['the same unit', '4B', '4B'],
      ['the same unit in another case', '4B', '4b'],
      ['no unit for the new one', '4B', null],
      ['no unit for the saved one', null, '4B'],
      ['no unit for either', null, null],
    ])('asks about %s', async (_, savedUnit, unit) => {
      await save('1 Main St', { unit: savedUnit });

      const outcome = await saveApartment(db, fakeMaps, {
        address: '1 Main St',
        unit,
        allowDuplicate: false,
      });

      expect(outcome.kind).toBe('duplicate');
    });

    test('lists only the units that could be this one, oldest first', async () => {
      const unitless = await save('1 Main St');
      await save('1 Main St', { unit: '5A', allowDuplicate: true });
      const same = await save('1 Main St', { unit: '4B', allowDuplicate: true });

      const outcome = await saveApartment(db, fakeMaps, {
        address: '1 Main St',
        unit: '4B',
        allowDuplicate: false,
      });

      expect(outcome).toEqual({
        kind: 'duplicate',
        existing: [
          { id: unitless, address: '1 Main St', unit: null, createdAt: expect.any(Date) },
          { id: same, address: '1 Main St', unit: '4B', createdAt: expect.any(Date) },
        ],
      } satisfies SaveOutcome);
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

describe('updateApartmentDetails', () => {
  test('stores the edited details, read back as they were saved', async () => {
    const id = await save('1 Main St');
    const edited = v.parse(ApartmentDetailsSchema, {
      unit: ' Apt. 4B ',
      rent: '$2,850',
      listingUrl: 'example.com/listing/1',
      nextStep: 'Send reference',
      agentContact: '',
      notes: 'Big kitchen\r\n— E',
    });

    await updateApartmentDetails(db, id, { edited, original: NO_DETAILS });

    expect((await getApartment(db, id))?.details).toEqual({
      unit: '4B',
      rent: 2850,
      listingUrl: 'https://example.com/listing/1',
      nextStep: 'Send reference',
      agentContact: null,
      notes: 'Big kitchen\n— E',
    } satisfies ApartmentDetails);
  });

  test('clears a field emptied in the form', async () => {
    const id = await save('1 Main St');
    const withNotes = { ...NO_DETAILS, notes: 'Noisy street' };
    await updateApartmentDetails(db, id, { edited: withNotes, original: NO_DETAILS });

    await updateApartmentDetails(db, id, { edited: NO_DETAILS, original: withNotes });

    expect((await getApartment(db, id))?.details).toEqual(NO_DETAILS);
  });

  describe('when someone else saved since the form opened', () => {
    test('keeps what they changed and this edit did not', async () => {
      const id = await save('1 Main St');
      await updateApartmentDetails(db, id, {
        edited: { ...NO_DETAILS, notes: 'Their note' },
        original: NO_DETAILS,
      });

      await updateApartmentDetails(db, id, {
        edited: { ...NO_DETAILS, rent: 2850 },
        original: NO_DETAILS,
      });

      expect((await getApartment(db, id))?.details).toEqual({
        ...NO_DETAILS,
        rent: 2850,
        notes: 'Their note',
      });
    });
  });

  test('refuses an unknown id with a 404', async () => {
    await expect(
      updateApartmentDetails(db, 404 as ApartmentId, {
        edited: { ...NO_DETAILS, rent: 2850 },
        original: NO_DETAILS,
      }),
    ).rejects.toEqual({
      status: 404,
      body: { message: 'No saved apartment has that link.', status: 404 },
    });
  });
});

describe('setApartmentStatus', () => {
  test('stores the status', async () => {
    const id = await save('1 Main St');

    await setApartmentStatus(db, id, 'visited');

    expect((await getApartment(db, id))?.status).toBe('visited');
  });

  test('refuses an unknown id with a 404', async () => {
    await expect(setApartmentStatus(db, 404 as ApartmentId, 'visited')).rejects.toEqual({
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

describe('listApartmentChoices', () => {
  test('lists the newest first, with what tells them apart', async () => {
    const first = await save('1 Main St', { unit: '4B' });
    await setApartmentStatus(db, first, 'not_for_us');
    const second = await save('2 Main St');

    expect(await listApartmentChoices(db)).toEqual([
      { id: second, address: '2 Main St', unit: null, status: 'interested' },
      { id: first, address: '1 Main St', unit: '4B', status: 'not_for_us' },
    ]);
  });
});

describe('listApartments', () => {
  // `fakeMaps` walks in 12 minutes, bikes in 4, drives in 9 and takes transit in 18.
  const FAKE_TIMES = {
    'metro-north-walk': { kind: 'trip', minutes: 12, status: 'met' },
    'metro-north-bike': { kind: 'trip', minutes: 4, status: 'met' },
    'hebrew-institute-walk': { kind: 'trip', minutes: 12, status: 'met' },
    'park-walk': { kind: 'trip', minutes: 12, status: 'partial' },
    'grocery-walk': { kind: 'trip', minutes: 12, status: 'partial' },
    'bet-am-shalom-walk': { kind: 'trip', minutes: 12, status: 'met' },
    'bet-am-shalom-transit-fri': { kind: 'trip', minutes: 18, status: 'met' },
    'bet-am-shalom-transit-sat': { kind: 'trip', minutes: 18, status: 'met' },
    'cbst-transit': { kind: 'trip', minutes: 18, status: 'met' },
    'florham-park-drive': { kind: 'trip', minutes: 9, status: 'met' },
  } as const;

  test('lists the newest first, with a time for each column', async () => {
    const first = await save('1 Main St', { unit: '4B' });
    await updateApartmentDetails(db, first, {
      edited: { ...NO_DETAILS, unit: '4B', rent: 2850, nextStep: 'Call the agent' },
      original: { ...NO_DETAILS, unit: '4B' },
    });
    await setApartmentStatus(db, first, 'visited');
    const second = await save('2 Main St');

    expect(await listApartments(db)).toEqual([
      {
        id: second,
        address: '2 Main St',
        unit: null,
        status: 'interested',
        rent: null,
        nextStep: null,
        times: FAKE_TIMES,
      },
      {
        id: first,
        address: '1 Main St',
        unit: '4B',
        status: 'visited',
        rent: 2850,
        nextStep: 'Call the agent',
        times: FAKE_TIMES,
      },
    ]);
  });

  test('marks a destination the snapshot lacks as missing', async () => {
    const entries = await freshEntries('1 Main St');
    await insert(
      '1 Main St',
      entries.filter(({ id }) => id !== 'bet-am-shalom'),
      new Date(),
    );

    const [apartment] = await listApartments(db);
    expect(apartment?.times).toEqual({
      ...FAKE_TIMES,
      'bet-am-shalom-walk': { kind: 'missing' },
      'bet-am-shalom-transit-fri': { kind: 'missing' },
      'bet-am-shalom-transit-sat': { kind: 'missing' },
    });
  });

  test('is empty with nothing saved', async () => {
    expect(await listApartments(db)).toEqual([]);
  });
});
