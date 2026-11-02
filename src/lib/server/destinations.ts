import type { Goal } from '#lib/types.ts';
import { FARMERS_MARKETS, PARKS, SUBWAY_STOPS } from './candidateLocations';
import type { CoordinatePoint } from './closestDest';
import { DayOfWeek } from './departureTime';
import type { Trip } from './gmapsRouting';

export const ORIGIN_SUFFIX = ', New York, NY';

export interface Candidate extends CoordinatePoint {
  name: string;
  address: string;
  lines?: readonly string[];
}

export interface Destination {
  id: string;
  title: string;
  goal: Goal;
  place: { address: string } | { closestOf: Candidate[] };
  trips: readonly Trip[]; // Display order.
}

const WALK: Trip = { mode: 'walk' };
const SATURDAY_NIGHT: Trip = {
  mode: 'transit',
  departure: { day: DayOfWeek.Saturday, hour: 19, minute: 0 },
};

export const DESTINATIONS: readonly Destination[] = [
  {
    id: 'work',
    title: 'Work 👨🏼‍💻',
    goal: { strictness: 'must', idealMinutes: 15, maxMinutes: 25 },
    place: { address: '1 Madison Ave, New York, NY 10010' },
    trips: [
      { mode: 'transit', departure: { day: DayOfWeek.Monday, hour: 8, minute: 45 } },
      { mode: 'bike' },
      WALK,
    ],
  },
  {
    id: 'subway-stop',
    title: 'Subway stop 🚇',
    goal: { strictness: 'must', idealMinutes: 7, maxMinutes: 12 },
    place: { closestOf: SUBWAY_STOPS },
    trips: [WALK],
  },
  {
    id: 'park',
    title: 'Park 🌳',
    goal: { strictness: 'must', idealMinutes: 10, maxMinutes: 15 },
    place: { closestOf: PARKS },
    trips: [WALK],
  },
  {
    id: 'farmers-market',
    title: 'Farmers market 🍉 (low priority)',
    goal: { strictness: 'should', idealMinutes: 15, maxMinutes: 20 },
    place: { closestOf: FARMERS_MARKETS },
    trips: [WALK],
  },
  {
    id: 'downtown-brooklyn',
    title: 'Downtown Brooklyn',
    goal: { strictness: 'should', idealMinutes: 30, maxMinutes: 45 },
    place: { address: '409 Fulton St, Brooklyn, NY 11201' },
    trips: [SATURDAY_NIGHT],
  },
  {
    id: 'park-slope',
    title: 'Park Slope',
    goal: { strictness: 'should', idealMinutes: 40, maxMinutes: 55 },
    place: { address: 'Grand Army Plz, Brooklyn, NY 11238' },
    trips: [SATURDAY_NIGHT],
  },
  {
    id: 'williamsburg',
    title: 'Williamsburg',
    goal: { strictness: 'should', idealMinutes: 35, maxMinutes: 50 },
    place: { address: '551 Driggs Ave, Brooklyn, NY 11211' },
    trips: [SATURDAY_NIGHT],
  },
  {
    id: 'astoria',
    title: 'Astoria (low priority)',
    goal: { strictness: 'should', idealMinutes: 40, maxMinutes: 55 },
    place: { address: '31-02 Astoria Blvd, Astoria, NY 11102' },
    trips: [SATURDAY_NIGHT],
  },
  {
    id: 'jackson-heights',
    title: 'Jackson Heights (low priority)',
    goal: { strictness: 'should', idealMinutes: 40, maxMinutes: 55 },
    place: { address: '74-01 Roosevelt Ave, Flushing, NY 11372' },
    trips: [SATURDAY_NIGHT],
  },
  {
    id: 'mott-haven',
    title: 'Mott Haven (low priority)',
    goal: { strictness: 'should', idealMinutes: 40, maxMinutes: 55 },
    place: { address: '500 Grand Concourse, Bronx, NY 10451' },
    trips: [SATURDAY_NIGHT],
  },
  {
    id: 'jersey-city',
    title: 'Jersey City (low priority)',
    goal: { strictness: 'should', idealMinutes: 45, maxMinutes: 60 },
    place: { address: '90 Christopher Columbus Dr, Jersey City, NJ 07302' },
    trips: [SATURDAY_NIGHT],
  },
];
