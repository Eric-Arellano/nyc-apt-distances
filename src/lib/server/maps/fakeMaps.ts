import type { Route } from '#lib/types.ts';
import type { Maps } from './maps.ts';
import type { Trip } from './routing.ts';

const ROUTES: Record<Trip['mode'], Route> = {
  walk: { mode: 'walk', timeMinutes: 12, distanceMiles: 0.8 },
  bike: { mode: 'bike', timeMinutes: 4, distanceMiles: 1.5 },
  drive: { mode: 'drive', timeMinutes: 9, distanceMiles: 3.2 },
  transit: { mode: 'transit', timeMinutes: 18, rides: [{ line: 'Harlem', vehicle: 'train' }] },
};

/** A `Maps` that serves canned results for `MOCK=1` and tests, so neither spends the Google key. */
export const fakeMaps: Maps = {
  geocode: async (address) => ({
    // Ignores case and spacing, so `MOCK=1` finds a saved apartment again as Google would.
    placeId: `fake:${address.trim().replace(/\s+/g, ' ').toLowerCase()}`,
    // 100 Martine Ave, the county office building, so `MOCK=1` picks White Plains candidates.
    coordinates: { latitude: 41.03036, longitude: -73.769965 },
  }),
  computeRoute: async ({ trip }) => ROUTES[trip.mode],
};
