import type { Goal } from '#lib/travelTimes.ts';
import { type Candidates, PARKS, SUPERMARKETS } from './candidateLocations.ts';
import type { Trip } from './maps/routing.ts';
import { DayOfWeek } from './maps/weeklyTime.ts';

/**
 * The county an origin address must be in. Without a fixed suffix, an address missing its town
 * lands wherever Google guesses, so geocoding rejects a match outside this county.
 */
export const ORIGIN_COUNTY = 'Westchester County';

/**
 * Each trip is judged by itself, so a fast drive or bike never makes a slow walk look good. Goal
 * and label are display only: unlike `trip`, changing them leaves saved travel times current.
 */
export interface DestinationTrip {
  trip: Trip;
  goal?: Goal;
  label?: string; // Tells apart two trips of one mode, like a bus on each day.
}

export interface Destination {
  id: string;
  title: string;
  place: { address: string } | { closestOf: Candidates };
  trips: readonly DestinationTrip[]; // Display order.
}

const WALK: Trip = { mode: 'walk' };

export const DESTINATIONS: readonly Destination[] = [
  {
    id: 'metro-north',
    title: 'White Plains Metro-North station',
    place: { address: '16 Ferris Ave, White Plains, NY 10601' },
    // Walking is safer, so it is preferred, but a bike ride within its goal will do.
    trips: [
      { trip: WALK, goal: { strictness: 'should', idealMinutes: 15, maxMinutes: 25 } },
      { trip: { mode: 'bike' }, goal: { strictness: 'must', idealMinutes: 10, maxMinutes: 15 } },
    ],
  },
  {
    id: 'hebrew-institute',
    title: 'Hebrew Institute of White Plains',
    place: { address: '20 Greenridge Ave, White Plains, NY 10605' },
    trips: [{ trip: WALK, goal: { strictness: 'must', idealMinutes: 15, maxMinutes: 25 } }],
  },
  {
    id: 'park',
    title: 'Park or trail',
    place: { closestOf: PARKS },
    // Only a walk, because it is for Shabbat.
    trips: [{ trip: WALK, goal: { strictness: 'should', idealMinutes: 10, maxMinutes: 20 } }],
  },
  {
    id: 'grocery',
    title: 'Grocery store',
    place: { closestOf: SUPERMARKETS },
    // Only a walk: any store is a reasonable drive, so the question is whether the car is needed.
    trips: [{ trip: WALK, goal: { strictness: 'should', idealMinutes: 10, maxMinutes: 20 } }],
  },
  {
    id: 'bet-am-shalom',
    title: 'Bet Am Shalom',
    place: { address: '295 Soundview Ave, White Plains, NY 10606' },
    // Walking is the plan. Transit is the fallback without a car, and only it depends on the day,
    // so the walk and drive are listed once. The drive departs a quarter hour before Friday's
    // service, the busier of the two for traffic.
    trips: [
      { trip: WALK, goal: { strictness: 'should', idealMinutes: 30, maxMinutes: 45 } },
      {
        trip: { mode: 'transit', arriveBy: { day: DayOfWeek.Friday, hour: 18, minute: 15 } },
        goal: { strictness: 'should', idealMinutes: 30, maxMinutes: 45 },
        label: 'Friday 6:15 pm',
      },
      {
        trip: { mode: 'transit', arriveBy: { day: DayOfWeek.Saturday, hour: 9, minute: 30 } },
        goal: { strictness: 'should', idealMinutes: 30, maxMinutes: 45 },
        label: 'Saturday 9:30 am',
      },
      {
        trip: { mode: 'drive', departAt: { day: DayOfWeek.Friday, hour: 18, minute: 0 } },
        goal: { strictness: 'should', maxMinutes: 15 },
      },
    ],
  },
  {
    id: 'cbst',
    title: 'Congregation Beit Simchat Torah, Saturday 10 am',
    place: { address: '130 W 30th St, New York, NY 10001' },
    // 9:50 already leaves time to be seated for the 10 am service, so any wait counts from it.
    trips: [
      {
        trip: { mode: 'transit', arriveBy: { day: DayOfWeek.Saturday, hour: 9, minute: 50 } },
        goal: { strictness: 'should', idealMinutes: 75, maxMinutes: 95 },
      },
    ],
  },
  {
    id: 'florham-park',
    title: 'Florham Park, NJ',
    place: { address: 'Florham Park, NJ 07932' },
    trips: [
      {
        trip: { mode: 'drive', departAt: { day: DayOfWeek.Sunday, hour: 11, minute: 0 } },
        goal: { strictness: 'should', idealMinutes: 45, maxMinutes: 60 },
      },
    ],
  },
];

/**
 * The trips the comparison table gives a column, grouped under their destination, in display
 * order. Each is named by its position in the destination's `trips`, since mode alone cannot tell
 * Bet Am Shalom's two buses apart. Unlike `trips`, this list is free to change.
 */
export interface ComparisonGroup {
  destinationId: string;
  shortTitle: string; // What we call it anyway. The full title is the header's tooltip.
  columns: readonly { tripIndex: number; icon: string; label?: string }[];
}

export const COMPARISON_GROUPS: readonly ComparisonGroup[] = [
  {
    destinationId: 'metro-north',
    shortTitle: 'Station',
    columns: [
      { tripIndex: 0, icon: '🚶' },
      { tripIndex: 1, icon: '🚴' },
    ],
  },
  { destinationId: 'hebrew-institute', shortTitle: 'HI', columns: [{ tripIndex: 0, icon: '🚶' }] },
  { destinationId: 'park', shortTitle: 'Park', columns: [{ tripIndex: 0, icon: '🚶' }] },
  { destinationId: 'grocery', shortTitle: 'Grocery', columns: [{ tripIndex: 0, icon: '🚶' }] },
  {
    destinationId: 'bet-am-shalom',
    shortTitle: 'Bet Am Shalom', // Three columns leave room for the whole name.
    // No drive: driving there is always reasonable, so it never tells apartments apart.
    columns: [
      { tripIndex: 0, icon: '🚶' },
      { tripIndex: 1, icon: '🚌', label: 'Fri' },
      { tripIndex: 2, icon: '🚌', label: 'Sat' },
    ],
  },
  { destinationId: 'cbst', shortTitle: 'CBST', columns: [{ tripIndex: 0, icon: '🚆' }] },
  { destinationId: 'florham-park', shortTitle: 'Florham', columns: [{ tripIndex: 0, icon: '🚗' }] },
];
