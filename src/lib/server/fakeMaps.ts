import type { Route } from '#lib/types.ts';
import type { Trip } from './gmapsRouting';
import type { Maps } from './travelTimes';

const ROUTES: Record<Trip['mode'], Route> = {
  walk: { mode: 'walk', timeMinutes: 12, distanceMiles: 0.8 },
  bike: { mode: 'bike', timeMinutes: 4, distanceMiles: 1.5 },
  transit: { mode: 'transit', timeMinutes: 18, summary: '2' },
};

// Serves `MOCK=1` and tests, so neither spends the Google key.
export const fakeMaps: Maps = {
  geocode: async () => ({ latitude: 40.735881, longitude: -73.99077 }),
  computeRoute: async ({ trip }) => ROUTES[trip.mode],
};
