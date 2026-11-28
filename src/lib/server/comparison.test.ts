import { describe, expect, test } from 'vitest';
import type { DestinationResult, Goal } from '#lib/types.ts';
import { TABLE_GROUPS, timeCell, toColumnGroups } from './comparison.ts';
import { DESTINATIONS, type Destination } from './destinations.ts';

describe('TABLE_GROUPS', () => {
  // Keys are in shared links, so renaming one breaks them.
  test('names each column by destination, mode and label', () => {
    expect(TABLE_GROUPS.flatMap(({ columns }) => columns.map(({ key }) => key))).toEqual([
      'metro-north-walk',
      'metro-north-bike',
      'hebrew-institute-walk',
      'park-walk',
      'grocery-walk',
      'bet-am-shalom-walk',
      'bet-am-shalom-transit-fri',
      'bet-am-shalom-transit-sat',
      'cbst-transit',
      'florham-park-drive',
    ]);
  });
});

describe('toColumnGroups', () => {
  const destination: Destination = {
    id: 'bet-am-shalom',
    title: 'Bet Am Shalom',
    place: { address: '295 Soundview Ave, White Plains, NY 10606' },
    trips: [{ trip: { mode: 'walk' } }, { trip: { mode: 'bike' }, label: 'Sunday' }],
  };

  test('describes each column from its trip', () => {
    const groups = toColumnGroups(
      [destination],
      [
        {
          destinationId: 'bet-am-shalom',
          shortTitle: 'BAS',
          columns: [
            { tripIndex: 0, icon: '🚶' },
            { tripIndex: 1, icon: '🚴', label: 'Sun' },
          ],
        },
      ],
    );
    expect(groups).toEqual([
      {
        title: 'Bet Am Shalom',
        shortTitle: 'BAS',
        columns: [
          {
            key: 'bet-am-shalom-walk',
            destinationId: 'bet-am-shalom',
            tripIndex: 0,
            icon: '🚶',
            label: undefined,
            title: 'Bet Am Shalom: walk',
          },
          {
            key: 'bet-am-shalom-bike-sun',
            destinationId: 'bet-am-shalom',
            tripIndex: 1,
            icon: '🚴',
            label: 'Sun',
            title: 'Bet Am Shalom: bike, Sunday',
          },
        ],
      },
    ]);
  });

  test('rejects an unknown destination', () => {
    expect(() =>
      toColumnGroups(DESTINATIONS, [{ destinationId: 'nowhere', shortTitle: 'X', columns: [] }]),
    ).toThrow('No destination nowhere');
  });

  test('rejects a trip the destination lacks', () => {
    expect(() =>
      toColumnGroups(
        [destination],
        [
          {
            destinationId: 'bet-am-shalom',
            shortTitle: 'BAS',
            columns: [{ tripIndex: 2, icon: '🚗' }],
          },
        ],
      ),
    ).toThrow('No trip 2 to bet-am-shalom');
  });
});

describe('timeCell', () => {
  const GOAL: Goal = { strictness: 'should', idealMinutes: 10, maxMinutes: 20 };
  const column = { key: 'park-walk', destinationId: 'park', tripIndex: 0, icon: '🚶', title: '' };

  function results(trip: DestinationResult['trips'][number]): DestinationResult[] {
    return [{ id: 'park', title: 'Park', closest: { name: 'Turnure Park' }, trips: [trip] }];
  }

  test('judges the trip against its goal', () => {
    const route = { mode: 'walk', timeMinutes: 15, distanceMiles: 0.7 } as const;
    expect(timeCell(results({ goal: GOAL, route }), column)).toEqual({
      kind: 'trip',
      minutes: 15,
      status: 'partial',
    });
  });

  test('leaves a trip with no goal unjudged', () => {
    const route = { mode: 'walk', timeMinutes: 15, distanceMiles: 0.7 } as const;
    expect(timeCell(results({ route }), column)).toEqual({
      kind: 'trip',
      minutes: 15,
      status: undefined,
    });
  });

  test('counts no route as unmet', () => {
    const route = { mode: 'unavailable', tripMode: 'walk' } as const;
    expect(timeCell(results({ goal: GOAL, route }), column)).toEqual({
      kind: 'trip',
      minutes: null,
      status: 'unmet',
    });
  });

  test('is missing when the snapshot lacks the destination', () => {
    expect(timeCell([], column)).toEqual({ kind: 'missing' });
  });
});
