import { describe, expect, test, vi } from 'vitest';
import { DESTINATIONS, ORIGIN_COUNTY } from './destinations';
import { fakeMaps } from './fakeMaps';
import { computeTravelTimes, type Maps } from './travelTimes';

function spyMaps() {
  return { geocode: vi.fn(fakeMaps.geocode), computeRoute: vi.fn(fakeMaps.computeRoute) };
}

describe('computeTravelTimes', () => {
  test('returns every destination in display order', async () => {
    const results = await computeTravelTimes('1 Main St', fakeMaps);

    expect(results.map((result) => result.id)).toEqual(DESTINATIONS.map(({ id }) => id));
  });

  test('geocodes within the origin county and routes each trip from the address as typed', async () => {
    const maps = spyMaps();
    const origin = '1 Main St, New York';

    await computeTravelTimes(origin, maps);

    expect(maps.geocode).toHaveBeenCalledExactlyOnceWith(origin, ORIGIN_COUNTY);
    expect(maps.computeRoute).toHaveBeenCalledTimes(
      DESTINATIONS.flatMap(({ trips }) => trips).length,
    );
    expect(maps.computeRoute.mock.calls.every(([options]) => options.origin === origin)).toBe(true);
  });

  test('fails when a route fails', async () => {
    const maps: Maps = {
      ...fakeMaps,
      computeRoute: async () => {
        throw new Error('computeRoutes returned 500');
      },
    };

    await expect(computeTravelTimes('1 Main St', maps)).rejects.toThrow(
      'computeRoutes returned 500',
    );
  });

  describe('for a fixed address', () => {
    test('keeps trip order and names no place', async () => {
      const results = await computeTravelTimes('1 Main St', fakeMaps);

      expect(results[0]).toEqual({
        id: 'work',
        title: 'Work 👨🏼‍💻',
        goal: { strictness: 'must', idealMinutes: 15, maxMinutes: 25 },
        closest: null,
        routes: [
          { mode: 'transit', timeMinutes: 18, summary: '2' },
          { mode: 'bike', timeMinutes: 4, distanceMiles: 1.5 },
          { mode: 'walk', timeMinutes: 12, distanceMiles: 0.8 },
        ],
      });
    });
  });

  describe('for the closest of several candidates', () => {
    test('routes to the candidate nearest the origin and names it', async () => {
      const maps = spyMaps();

      const results = await computeTravelTimes('1 Main St', maps);

      expect(results.find(({ id }) => id === 'park')?.closest).toEqual({
        name: 'Union Square Park',
      });
      expect(maps.computeRoute).toHaveBeenCalledWith({
        origin: '1 Main St',
        dest: '201 Park Ave S, New York, NY 10003',
        trip: { mode: 'walk' },
      });
    });

    test('lists the lines of a subway stop', async () => {
      const results = await computeTravelTimes('1 Main St', fakeMaps);

      expect(results.find(({ id }) => id === 'subway-stop')?.closest).toEqual({
        name: '14 St - Union Square',
        additionalInfo: 'with L, N, Q, R, W, 4, 5, 6',
      });
    });
  });
});
