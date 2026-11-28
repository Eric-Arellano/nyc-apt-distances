import { createHash } from 'node:crypto';
import { describe, expect, test, vi } from 'vitest';
import type { Destination } from './destinations.ts';
import { fakeMaps } from './maps/fakeMaps.ts';
import type { Maps } from './maps/maps.ts';
import { computeTravelTimes, fingerprint, toDestinationResults } from './travelTimes.ts';

const GOAL = { strictness: 'must', idealMinutes: 15, maxMinutes: 25 } as const;

/** A destination of our own, so editing the real config doesn't break these tests. */
const FIXED: Destination = {
  id: 'fixed',
  title: 'Fixed address',
  place: { address: '20 Greenridge Ave, White Plains, NY 10605' },
  trips: [
    { trip: { mode: 'walk' }, goal: GOAL },
    { trip: { mode: 'bike' }, label: 'Bike' },
  ],
};

const CLOSEST: Destination = {
  id: 'closest',
  title: 'Closest park',
  place: {
    closestOf: [
      {
        name: 'Kensico Dam Plaza',
        latitude: 41.072246,
        longitude: -73.766394,
        address: '1 Bronx River Pkwy, Valhalla, NY 10595',
      },
      {
        name: 'Bronx River Pathway (County Center)',
        latitude: 41.035662,
        longitude: -73.776418,
        address: '198 Central Ave, White Plains, NY 10606',
      },
    ],
  },
  trips: [{ trip: { mode: 'walk' }, goal: GOAL }],
};

const DESTINATIONS = [FIXED, CLOSEST];

// Downtown White Plains, nearer the pathway than the dam.
const POINT = { latitude: 41.03036, longitude: -73.769965 };

function compute(origin: string, destinations: Destination[], maps: Maps = fakeMaps) {
  return computeTravelTimes(origin, POINT, destinations, maps);
}

function spyMaps() {
  return { geocode: vi.fn(fakeMaps.geocode), computeRoute: vi.fn(fakeMaps.computeRoute) };
}

describe('computeTravelTimes', () => {
  test('returns every destination in the order given', async () => {
    const results = await compute('1 Main St', [CLOSEST, FIXED]);

    expect(results.map((result) => result.id)).toEqual(['closest', 'fixed']);
  });

  test('routes each trip from the address as typed', async () => {
    const maps = spyMaps();
    const origin = '1 Main St, White Plains';

    await compute(origin, DESTINATIONS, maps);

    expect(maps.computeRoute).toHaveBeenCalledTimes(3);
    expect(maps.computeRoute.mock.calls.every(([options]) => options.origin === origin)).toBe(true);
  });

  test('fails when a route fails', async () => {
    const maps: Maps = {
      ...fakeMaps,
      computeRoute: async () => {
        throw new Error('computeRoutes returned 500');
      },
    };

    await expect(compute('1 Main St', DESTINATIONS, maps)).rejects.toThrow(
      'computeRoutes returned 500',
    );
  });

  describe('for a fixed address', () => {
    test('keeps trip order and names no place', async () => {
      const [result] = await compute('1 Main St', [FIXED]);

      expect(result).toEqual({
        id: 'fixed',
        fingerprint: fingerprint(FIXED),
        closest: null,
        routes: [
          { mode: 'walk', timeMinutes: 12, distanceMiles: 0.8 },
          { mode: 'bike', timeMinutes: 4, distanceMiles: 1.5 },
        ],
      });
    });
  });

  describe('for the closest of several candidates', () => {
    test('routes to the candidate nearest the origin and names it', async () => {
      const maps = spyMaps();

      const [result] = await compute('1 Main St', [CLOSEST], maps);

      expect(result?.closest).toEqual({ name: 'Bronx River Pathway (County Center)' });
      expect(maps.computeRoute).toHaveBeenCalledExactlyOnceWith({
        origin: '1 Main St',
        dest: '198 Central Ave, White Plains, NY 10606',
        trip: { mode: 'walk' },
      });
    });
  });
});

describe('fingerprint', () => {
  test('is the same for the same place and trips', () => {
    expect(fingerprint({ ...FIXED })).toBe(fingerprint(FIXED));
  });

  test('ignores title, goals and labels', () => {
    const reworded = {
      ...FIXED,
      title: 'New title',
      trips: FIXED.trips.map(({ trip }) => ({ trip, goal: { ...GOAL, maxMinutes: 99 } })),
    };

    expect(fingerprint(reworded)).toBe(fingerprint(FIXED));
  });

  // Saved apartments were fingerprinted before trips carried goals; matching keeps them current.
  test('hashes the same as a bare list of trips', () => {
    expect(fingerprint(FIXED)).toBe(
      createHash('sha256')
        .update(JSON.stringify({ place: FIXED.place, trips: [{ mode: 'walk' }, { mode: 'bike' }] }))
        .digest('hex'),
    );
  });

  test.each([
    ['a moved address', { place: { address: '1 Elsewhere Rd, White Plains, NY' } }],
    ['a changed candidate list', { place: { closestOf: [] } }],
    ['an added trip', { trips: [...FIXED.trips, { trip: { mode: 'drive' } }] }],
    ['reordered trips', { trips: [...FIXED.trips].reverse() }],
  ] as [string, Partial<Destination>][])('changes with %s', (_, change) => {
    expect(fingerprint({ ...FIXED, ...change })).not.toBe(fingerprint(FIXED));
  });
});

describe('toDestinationResults', () => {
  test('joins each entry with its destination copy, in the destinations order', async () => {
    const entries = await compute('1 Main St', DESTINATIONS);

    const { results, missing } = toDestinationResults([...entries].reverse(), DESTINATIONS);

    expect(results).toEqual([
      {
        id: 'fixed',
        title: 'Fixed address',
        closest: null,
        trips: [
          { goal: GOAL, route: { mode: 'walk', timeMinutes: 12, distanceMiles: 0.8 } },
          { label: 'Bike', route: { mode: 'bike', timeMinutes: 4, distanceMiles: 1.5 } },
        ],
      },
      {
        id: 'closest',
        title: 'Closest park',
        closest: { name: 'Bronx River Pathway (County Center)' },
        trips: [{ goal: GOAL, route: entries[1]?.routes[0] }],
      },
    ]);
    expect(missing).toEqual([]);
  });

  test('drops an entry whose destination is no longer in code', async () => {
    const entries = await compute('1 Main St', DESTINATIONS);

    expect(toDestinationResults(entries, [CLOSEST])).toEqual({
      results: [expect.objectContaining({ id: 'closest' })],
      missing: [],
    });
  });

  test.each([
    ['has no entry', [FIXED]],
    ['changed its place or trips', [FIXED, { ...CLOSEST, trips: [{ trip: { mode: 'bike' } }] }]],
  ] as [string, Destination[]][])('names a destination that %s as missing', async (_, computed) => {
    const entries = await compute('1 Main St', computed);

    expect(toDestinationResults(entries, DESTINATIONS)).toEqual({
      results: [expect.objectContaining({ id: 'fixed' })],
      missing: ['Closest park'],
    });
  });
});
