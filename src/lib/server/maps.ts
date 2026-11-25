import { GOOGLE_MAPS_TOKEN, MOCK } from '$app/env/private';
import { fakeMaps } from './fakeMaps';
import { googleMaps, type Maps } from './travelTimes';

// `MOCK=1` fakes only Google; saves still reach the database.
export function getMaps(): Maps {
  if (MOCK) return fakeMaps;
  if (!GOOGLE_MAPS_TOKEN) throw new Error('GOOGLE_MAPS_TOKEN must be set as an env var.');
  return googleMaps(GOOGLE_MAPS_TOKEN);
}
