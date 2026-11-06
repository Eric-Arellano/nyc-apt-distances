import { describe, expect, test, vi } from 'vitest';
import { type Destination, ORIGIN_COUNTY } from './destinations';
import { fakeMaps } from './fakeMaps';
import { computeTravelTimes, type Maps } from './travelTimes';

const GOAL = { strictness: 'must', idealMinutes: 15, maxMinutes: 25 } as const;

// Our own destinations, so editing the real config doesn't break these tests.
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

function spyMaps() {
  return { geocode: vi.fn(fakeMaps.geocode), computeRoute: vi.fn(fakeMaps.computeRoute) };
}

describe('computeTravelTimes', () => {
  test('returns every destination in the order given', async () => {
    const results = await computeTravelTimes('1 Main St', [CLOSEST, FIXED], fakeMaps);

    expect(results.map((result) => result.id)).toEqual(['closest', 'fixed']);
  });

  test('geocodes within the origin county and routes each trip from the address as typed', async () => {
    const maps = spyMaps();
    const origin = '1 Main St, White Plains';

    await computeTravelTimes(origin, DESTINATIONS, maps);

    expect(maps.geocode).toHaveBeenCalledExactlyOnceWith(origin, ORIGIN_COUNTY);
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

    await expect(computeTravelTimes('1 Main St', DESTINATIONS, maps)).rejects.toThrow(
      'computeRoutes returned 500',
    );
  });

  describe('for a fixed address', () => {
    test('keeps trip order and names no place', async () => {
      const [result] = await computeTravelTimes('1 Main St', [FIXED], fakeMaps);

      expect(result).toEqual({
        id: 'fixed',
        title: 'Fixed address',
        goal: GOAL,
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

      const [result] = await computeTravelTimes('1 Main St', [CLOSEST], maps);

      expect(result?.closest).toEqual({ name: 'Bronx River Pathway (County Center)' });
      expect(maps.computeRoute).toHaveBeenCalledExactlyOnceWith({
        origin: '1 Main St',
        dest: '198 Central Ave, White Plains, NY 10606',
        trip: { mode: 'walk' },
      });
    });
  });
});
