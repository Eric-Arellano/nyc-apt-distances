import { describe, expect, test } from 'vitest';
import type { DestinationResult, Goal } from '#lib/types.ts';
import { PARKS } from './candidateLocations';
import type { Destination } from './destinations';
import { pairDestinations } from './sideBySide';

const GOAL: Goal = { strictness: 'should', idealMinutes: 30, maxMinutes: 45 };

const DESTINATIONS: Destination[] = [
  {
    id: 'park',
    title: 'Park or trail',
    place: { closestOf: PARKS },
    trips: [{ trip: { mode: 'walk' }, goal: GOAL }],
  },
  {
    id: 'bet-am-shalom',
    title: 'Bet Am Shalom',
    place: { address: '295 Soundview Ave, White Plains, NY 10606' },
    trips: [
      { trip: { mode: 'walk' }, goal: GOAL },
      {
        trip: { mode: 'transit', arriveBy: { day: 5, hour: 18, minute: 15 } },
        goal: GOAL,
        label: 'Friday 6:15 pm',
      },
      { trip: { mode: 'drive', departAt: { day: 5, hour: 18, minute: 0 } } },
    ],
  },
];

const WALK_20 = { mode: 'walk', timeMinutes: 20, distanceMiles: 1 } as const;
const WALK_50 = { mode: 'walk', timeMinutes: 50, distanceMiles: 2.4 } as const;
const BUS = { mode: 'transit', timeMinutes: 22, rides: [{ line: '5', vehicle: 'bus' }] } as const;
const NO_BUS = { mode: 'unavailable', tripMode: 'transit' } as const;
const DRIVE = { mode: 'drive', timeMinutes: 8, distanceMiles: 2.9 } as const;

function betAmShalom(...routes: DestinationResult['trips'][number]['route'][]): DestinationResult {
  const trips = DESTINATIONS[1]?.trips ?? [];
  return {
    id: 'bet-am-shalom',
    title: 'Bet Am Shalom',
    closest: null,
    trips: routes.map((route, index) => ({
      route,
      goal: trips[index]?.goal,
      label: trips[index]?.label,
    })),
  };
}

describe('pairDestinations', () => {
  test('lines up each trip by position, judged against its goal', () => {
    const left = [
      {
        id: 'park',
        title: 'Park or trail',
        closest: { name: 'Turnure Park' },
        trips: [{ route: WALK_20, goal: GOAL }],
      },
      betAmShalom(WALK_50, BUS, DRIVE),
    ];
    const right = [
      {
        id: 'park',
        title: 'Park or trail',
        closest: { name: 'Gillie Park' },
        trips: [{ route: WALK_50, goal: GOAL }],
      },
      betAmShalom(WALK_20, NO_BUS, DRIVE),
    ];

    expect(pairDestinations(DESTINATIONS, [left, right])).toEqual([
      {
        id: 'park',
        title: 'Park or trail',
        closest: ['Turnure Park', 'Gillie Park'],
        trips: [
          {
            mode: 'walk',
            label: undefined,
            goal: GOAL,
            sides: [
              { kind: 'trip', route: WALK_20, status: 'met' },
              { kind: 'trip', route: WALK_50, status: 'unmet' },
            ],
          },
        ],
      },
      {
        id: 'bet-am-shalom',
        title: 'Bet Am Shalom',
        closest: [null, null],
        trips: [
          {
            mode: 'walk',
            label: undefined,
            goal: GOAL,
            sides: [
              { kind: 'trip', route: WALK_50, status: 'unmet' },
              { kind: 'trip', route: WALK_20, status: 'met' },
            ],
          },
          {
            mode: 'transit',
            label: 'Friday 6:15 pm',
            goal: GOAL,
            sides: [
              { kind: 'trip', route: BUS, status: 'met' },
              { kind: 'trip', route: NO_BUS, status: 'unmet' },
            ],
          },
          {
            mode: 'drive',
            label: undefined,
            goal: undefined,
            sides: [
              { kind: 'trip', route: DRIVE, status: undefined },
              { kind: 'trip', route: DRIVE, status: undefined },
            ],
          },
        ],
      },
    ]);
  });

  test('leaves a gap on the side whose snapshot lacks a destination', () => {
    const [park, bas] = pairDestinations(DESTINATIONS, [[betAmShalom(WALK_20, BUS, DRIVE)], []]);

    expect(park?.closest).toEqual([null, null]);
    expect(park?.trips.map(({ sides }) => sides)).toEqual([
      [{ kind: 'missing' }, { kind: 'missing' }],
    ]);
    expect(bas?.trips.map(({ sides }) => sides[1])).toEqual([
      { kind: 'missing' },
      { kind: 'missing' },
      { kind: 'missing' },
    ]);
  });
});
