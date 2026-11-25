import { describe, expect, test, vi } from 'vitest';
import type { Destination } from './destinations';
import { fakeMaps } from './fakeMaps';
import { computeTravelTimes, fingerprint, type Maps, toDestinationResults } from './travelTimes';

const GOAL = { strictness: 'must', idealMinutes: 15, maxMinutes: 25 } as const;

/** A destination of our own, so editing the real config doesn't break these tests. */
const FIXED: Destination = {
  id: 'fixed',
  title: 'Fixed address',
  goal: GOAL,
  place: { address: '20 Greenridge Ave, White Plains, NY 10605' },
  trips: [{ mode: 'walk' }, { mode: 'bike' }],
};

const CLOSEST: Destination = {
  id: 'closest',
  title: 'Closest park',
  goal: GOAL,
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
  trips: [{ mode: 'walk' }],
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

  test('ignores title and goal', () => {
    const reworded = { ...FIXED, title: 'New title', goal: { ...GOAL, maxMinutes: 99 } };

    expect(fingerprint(reworded)).toBe(fingerprint(FIXED));
  });

  test.each([
    ['a moved address', { place: { address: '1 Elsewhere Rd, White Plains, NY' } }],
    ['a changed candidate list', { place: { closestOf: [] } }],
    ['an added trip', { trips: [...FIXED.trips, { mode: 'drive' }] }],
    ['reordered trips', { trips: [...FIXED.trips].reverse() }],
  ] as [string, Partial<Destination>][])('changes with %s', (_, change) => {
    expect(fingerprint({ ...FIXED, ...change })).not.toBe(fingerprint(FIXED));
  });
});

describe('toDestinationResults', () => {
  test('joins each entry with its destination copy, in the destinations order', async () => {
    const entries = await compute('1 Main St', DESTINATIONS);

    const results = toDestinationResults([...entries].reverse(), DESTINATIONS);

    expect(results.map(({ id, title, goal }) => ({ id, title, goal }))).toEqual([
      { id: 'fixed', title: 'Fixed address', goal: GOAL },
      { id: 'closest', title: 'Closest park', goal: GOAL },
    ]);
    expect(results[0]).toEqual({
      id: 'fixed',
      title: 'Fixed address',
      goal: GOAL,
      closest: null,
      routes: entries[0]?.routes,
    });
  });

  test('drops an entry whose destination is no longer in code', async () => {
    const entries = await compute('1 Main St', DESTINATIONS);

    expect(toDestinationResults(entries, [CLOSEST]).map(({ id }) => id)).toEqual(['closest']);
  });

  test('skips a destination with no entry', async () => {
    const entries = await compute('1 Main St', [FIXED]);

    expect(toDestinationResults(entries, DESTINATIONS).map(({ id }) => id)).toEqual(['fixed']);
  });
});
