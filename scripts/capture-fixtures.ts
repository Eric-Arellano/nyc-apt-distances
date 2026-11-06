// Re-captures every Google fixture in tests/fixtures/google, using production's requests. Run it
// by hand, never from a test, because each request is billed: about eleven per run.
//
//   node scripts/capture-fixtures.ts [file ...]
//
// Naming files, such as `drive`, captures only those.
//
// `direnv exec . node scripts/capture-fixtures.ts` loads the key from `.envrc` without anyone
// reading the file. Run `npm run format` afterwards, because Biome lays out JSON arrays differently.
//
// Every address here is a public place, because the repo is public. Never add an apartment.
import { writeFileSync } from 'node:fs';
import { fetchGeocode } from '#lib/server/gmapsGeocoding.ts';
import {
  computeRoutes,
  type RouteOptions,
  routeRequest,
  type Trip,
} from '#lib/server/gmapsRouting.ts';
import { DayOfWeek } from '#lib/server/weeklyTime.ts';

const KEY = process.env.GOOGLE_MAPS_TOKEN;
if (!KEY) throw new Error('GOOGLE_MAPS_TOKEN must be set as an env var.');

const MONDAY_RUSH: Trip = {
  mode: 'transit',
  arriveBy: { day: DayOfWeek.Monday, hour: 9, minute: 30 },
};

const STATION = 'White Plains station, White Plains, NY 10601';
const LIBRARY = 'White Plains Public Library, 100 Martine Ave, White Plains, NY 10601';
const COLLEGE = 'Westchester Community College, 75 Grasslands Rd, Valhalla, NY 10595';

type Capture = { file: string } & ({ geocode: string } | RouteOptions);

const CAPTURES: Capture[] = [
  { file: 'geocode', geocode: '100 Martine Ave, White Plains, NY 10601' },
  { file: 'geocode-zero-results', geocode: 'zzqxv qqzzx wvvxq' },
  { file: 'geocode-partial-match', geocode: 'Qwxzv St, White Plains, NY' },
  { file: 'walk', origin: STATION, dest: LIBRARY, trip: { mode: 'walk' } },
  { file: 'bike', origin: LIBRARY, dest: COLLEGE, trip: { mode: 'bike' } },
  {
    file: 'drive',
    origin: STATION,
    dest: 'Florham Park, NJ 07932',
    trip: { mode: 'drive', departAt: { day: DayOfWeek.Sunday, hour: 11, minute: 0 } },
  },
  {
    file: 'transit-metro-north',
    origin: STATION,
    dest: '89 E 42nd St, New York, NY 10017',
    trip: MONDAY_RUSH,
  },
  {
    file: 'transit-transfer',
    origin: STATION,
    dest: '620 Atlantic Ave, Brooklyn, NY 11217',
    trip: MONDAY_RUSH,
  },
  { file: 'transit-bus', origin: LIBRARY, dest: COLLEGE, trip: MONDAY_RUSH },
  // Saturday night, when the reservation has no service.
  {
    file: 'transit-no-route',
    origin: LIBRARY,
    dest: 'Ward Pound Ridge Reservation, Cross River, NY 10518',
    trip: { mode: 'transit', arriveBy: { day: DayOfWeek.Saturday, hour: 19, minute: 0 } },
  },
];

async function capture(item: Capture, key: string): Promise<unknown> {
  if ('geocode' in item) return await fetchGeocode(key, item.geocode);
  return await computeRoutes(key, routeRequest(item));
}

const only = process.argv.slice(2);
for (const item of CAPTURES.filter(({ file }) => only.length === 0 || only.includes(file))) {
  const body = await capture(item, KEY).catch((cause) => {
    throw new Error(`Capturing ${item.file}.json failed`, { cause });
  });
  writeFileSync(
    new URL(`../tests/fixtures/google/${item.file}.json`, import.meta.url),
    `${JSON.stringify(body, null, 2)}\n`,
  );
  console.log(`Captured ${item.file}.json`);
}
