// Re-captures every Google fixture in tests/fixtures/google, using production's field masks. Run it
// by hand, never from a test, because each request is billed: about ten per run.
//
//   node scripts/capture-fixtures.ts
//
// `direnv exec . node scripts/capture-fixtures.ts` loads the key from `.envrc` without anyone
// reading the file. Run `npm run format` afterwards, because Biome lays out JSON arrays differently.
//
// Every address here is a public place, because the repo is public. Never add an apartment.
import { writeFileSync } from 'node:fs';
import { MODES } from '#lib/server/routeModes.ts';

const KEY = process.env.GOOGLE_MAPS_TOKEN;
if (!KEY) throw new Error('GOOGLE_MAPS_TOKEN must be set as an env var.');

// So `nextTime` reads its hours as New York time, like the app's arrival targets.
process.env.TZ = 'America/New_York';

// The next given weekday (0 is Sunday) at a New York wall-clock time, as RFC 3339.
function nextTime(weekday: number, hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + ((weekday - date.getDay() + 7) % 7 || 7));
  return date.toISOString();
}

const MONDAY_RUSH = nextTime(1, 9, 30);
const SATURDAY_NIGHT = nextTime(6, 19, 0);

const STATION = 'White Plains station, White Plains, NY 10601';
const LIBRARY = 'White Plains Public Library, 100 Martine Ave, White Plains, NY 10601';
const COLLEGE = 'Westchester Community College, 75 Grasslands Rd, Valhalla, NY 10595';

type Capture =
  | { file: string; geocode: string }
  | { file: string; mode: keyof typeof MODES; origin: string; dest: string; arriveBy?: string };

const CAPTURES: Capture[] = [
  { file: 'geocode', geocode: '100 Martine Ave, White Plains, NY 10601' },
  { file: 'geocode-zero-results', geocode: 'zzqxv qqzzx wvvxq' },
  { file: 'geocode-partial-match', geocode: 'Qwxzv St, White Plains, NY' },
  { file: 'walk', mode: 'walk', origin: STATION, dest: LIBRARY },
  { file: 'bike', mode: 'bike', origin: LIBRARY, dest: COLLEGE },
  {
    file: 'transit-metro-north',
    mode: 'transit',
    origin: STATION,
    dest: '89 E 42nd St, New York, NY 10017',
  },
  {
    file: 'transit-transfer',
    mode: 'transit',
    origin: STATION,
    dest: '620 Atlantic Ave, Brooklyn, NY 11217',
  },
  { file: 'transit-bus', mode: 'transit', origin: LIBRARY, dest: COLLEGE },
  // Saturday night, when the reservation has no service.
  {
    file: 'transit-no-route',
    mode: 'transit',
    origin: LIBRARY,
    dest: 'Ward Pound Ridge Reservation, Cross River, NY 10518',
    arriveBy: SATURDAY_NIGHT,
  },
];

async function capture(item: Capture, key: string): Promise<unknown> {
  if ('geocode' in item) {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.search = new URLSearchParams({ key, address: item.geocode }).toString();
    // `url` holds the key, so it must stay out of every error and log line here.
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${item.file}: geocoding returned ${response.status}`);
    return await response.json();
  }

  const { travelMode, fieldMask } = MODES[item.mode];
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({
      origin: { address: item.origin },
      destination: { address: item.dest },
      travelMode,
      ...(item.mode === 'transit' && { arrivalTime: item.arriveBy ?? MONDAY_RUSH }),
    }),
  });
  if (!response.ok) {
    throw new Error(
      `${item.file}: computeRoutes returned ${response.status}: ${await response.text()}`,
    );
  }
  return await response.json();
}

for (const item of CAPTURES) {
  const body = await capture(item, KEY);
  writeFileSync(
    new URL(`../tests/fixtures/google/${item.file}.json`, import.meta.url),
    `${JSON.stringify(body, null, 2)}\n`,
  );
  console.log(`Captured ${item.file}.json`);
}
