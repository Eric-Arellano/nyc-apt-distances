import type { Goal } from '#lib/types.ts';
import { PARKS, STATIONS, SUPERMARKETS } from './candidateLocations';
import type { CoordinatePoint } from './closestDest';
import type { Trip } from './gmapsRouting';

// Without a fixed suffix, an address missing its town lands wherever Google guesses, so geocoding
// rejects a match outside this county.
export const ORIGIN_COUNTY = 'Westchester County';

export interface Candidate extends CoordinatePoint {
  name: string;
  address: string;
}

export interface Destination {
  id: string;
  title: string;
  goal: Goal;
  place: { address: string } | { closestOf: Candidate[] };
  trips: readonly Trip[]; // Display order.
}

const WALK: Trip = { mode: 'walk' };

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
    trips: [WALK],
  },
];
