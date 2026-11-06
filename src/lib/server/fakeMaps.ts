import type { Route } from '#lib/types.ts';
import type { Trip } from './gmapsRouting';
import type { Maps } from './travelTimes';

const ROUTES: Record<Trip['mode'], Route> = {
  walk: { mode: 'walk', timeMinutes: 12, distanceMiles: 0.8 },
  bike: { mode: 'bike', timeMinutes: 4, distanceMiles: 1.5 },
  drive: { mode: 'drive', timeMinutes: 9, distanceMiles: 3.2 },
  transit: { mode: 'transit', timeMinutes: 18, rides: [{ line: 'Harlem', vehicle: 'train' }] },
};

// Serves `MOCK=1` and tests, so neither spends the Google key.
export const fakeMaps: Maps = {
  // 100 Martine Ave, the county office building, so `MOCK=1` picks White Plains candidates.
  geocode: async () => ({ latitude: 41.03036, longitude: -73.769965 }),
  computeRoute: async ({ trip }) => ROUTES[trip.mode],
};
