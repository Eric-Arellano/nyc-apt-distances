// Apart from `maps.ts` because importing `$app/env/private` validates every env var, so a test
// that imports this file fails without `SITE_PASSWORD` set.
import { GOOGLE_MAPS_TOKEN, MOCK } from '$app/env/private';
import { fakeMaps } from './fakeMaps.ts';
import { googleMaps, type Maps } from './maps.ts';

// `MOCK=1` fakes only Google; saves still reach the database.
export function getMaps(): Maps {
  if (MOCK) return fakeMaps;
  if (!GOOGLE_MAPS_TOKEN) throw new Error('GOOGLE_MAPS_TOKEN must be set as an env var.');
  return googleMaps(GOOGLE_MAPS_TOKEN);
}
