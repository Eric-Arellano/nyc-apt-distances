import type { Goal } from '#lib/types.ts';
import { type Candidates, PARKS, STATIONS, SUPERMARKETS } from './candidateLocations';
import { DayOfWeek } from './departureTime';
import type { Trip } from './gmapsRouting';

// Without a fixed suffix, an address missing its town lands wherever Google guesses, so geocoding
// rejects a match outside this county.
export const ORIGIN_COUNTY = 'Westchester County';

export interface Destination {
  id: string;
  title: string;
  goal: Goal;
  place: { address: string } | { closestOf: Candidates };
  trips: readonly Trip[]; // Display order.
}

const WALK: Trip = { mode: 'walk' };
const BET_AM_SHALOM = { address: '295 Soundview Ave, White Plains, NY 10606' };

export const DESTINATIONS: readonly Destination[] = [
  {
    id: 'metro-north',
    title: 'Metro-North station 🚆',
    goal: { strictness: 'must', idealMinutes: 10, maxMinutes: 20 },
    place: { closestOf: STATIONS },
    trips: [WALK, { mode: 'bike' }],
  },
  {
    id: 'hebrew-institute',
    title: 'Hebrew Institute of White Plains',
    goal: { strictness: 'must', idealMinutes: 15, maxMinutes: 25 },
    place: { address: '20 Greenridge Ave, White Plains, NY 10605' },
    trips: [WALK],
  },
  {
    id: 'park',
    title: 'Park or trail 🌳',
    goal: { strictness: 'should', idealMinutes: 10, maxMinutes: 20 },
    place: { closestOf: PARKS },
    trips: [WALK],
  },
  {
    id: 'grocery',
    title: 'Grocery store 🛒',
    goal: { strictness: 'should', idealMinutes: 10, maxMinutes: 20 },
    place: { closestOf: SUPERMARKETS },
    // Only a walk: any store is a reasonable drive, so the question is whether the car is needed.
    trips: [WALK],
  },
  {
    id: 'bet-am-shalom-friday',
    title: 'Bet Am Shalom, Friday 6:15 pm',
    goal: { strictness: 'should', idealMinutes: 15, maxMinutes: 25 },
    place: BET_AM_SHALOM,
    // Each drive departs a quarter hour before the target; in town, the exact minute barely moves
    // Google's traffic estimate.
    trips: [
      WALK,
      { mode: 'transit', arriveBy: { day: DayOfWeek.Friday, hour: 18, minute: 15 } },
      { mode: 'drive', departAt: { day: DayOfWeek.Friday, hour: 18, minute: 0 } },
    ],
  },
  {
    id: 'bet-am-shalom-saturday',
    title: 'Bet Am Shalom, Saturday 9:30 am',
    goal: { strictness: 'should', idealMinutes: 15, maxMinutes: 25 },
    place: BET_AM_SHALOM,
    trips: [
      WALK,
      { mode: 'transit', arriveBy: { day: DayOfWeek.Saturday, hour: 9, minute: 30 } },
      { mode: 'drive', departAt: { day: DayOfWeek.Saturday, hour: 9, minute: 15 } },
    ],
  },
  {
    id: 'cbst',
    title: 'Congregation Beit Simchat Torah, Saturday 10 am',
    goal: { strictness: 'should', idealMinutes: 75, maxMinutes: 95 },
    place: { address: '130 W 30th St, New York, NY 10001' },
    // 9:50 already leaves time to be seated for the 10 am service, so any wait counts from it.
    trips: [{ mode: 'transit', arriveBy: { day: DayOfWeek.Saturday, hour: 9, minute: 50 } }],
  },
  {
    id: 'florham-park',
    title: 'Florham Park, NJ',
    goal: { strictness: 'should', idealMinutes: 45, maxMinutes: 60 },
    place: { address: 'Florham Park, NJ 07932' },
    trips: [{ mode: 'drive', departAt: { day: DayOfWeek.Sunday, hour: 11, minute: 0 } }],
  },
];
