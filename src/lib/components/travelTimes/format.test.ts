import { describe, expect, test } from 'vitest';
import { formatRoute, goalText } from './format.js';

describe('goalText', () => {
  test('gives the max and the ideal', () => {
    expect(goalText({ strictness: 'must', idealMinutes: 7, maxMinutes: 12 })).toEqual(
      'Must be within 12 minutes; ideally within 7 minutes',
    );
  });

  test('gives only the max when there is no ideal', () => {
    expect(goalText({ strictness: 'should', maxMinutes: 15 })).toEqual(
      'Should be within 15 minutes',
    );
  });
});

describe('formatRoute', () => {
  test('bike', () => {
    expect(formatRoute({ mode: 'bike', timeMinutes: 4, distanceMiles: 2.1 })).toEqual(
      '🚴 4 minutes (2.1 miles)',
    );
  });

  test('drive', () => {
    expect(formatRoute({ mode: 'drive', timeMinutes: 9, distanceMiles: 3.2 })).toEqual(
      '🚗 9 minutes (3.2 miles)',
    );
  });

  test('walk', () => {
    expect(formatRoute({ mode: 'walk', timeMinutes: 4, distanceMiles: 2.1 })).toEqual(
      '🚶 4 minutes (2.1 miles)',
    );
    expect(
      formatRoute(
        { mode: 'walk', timeMinutes: 10, distanceMiles: 0.5 },
        { place: { name: 'Saxon Woods Park' } },
      ),
    ).toEqual('🚶 10 minutes to Saxon Woods Park (0.5 miles)');
  });

  describe('transit', () => {
    const bus = { line: '40', vehicle: 'bus' } as const;
    const train = { line: 'Harlem', vehicle: 'train' } as const;

    test('with no rides', () => {
      expect(formatRoute({ mode: 'transit', timeMinutes: 4, rides: [] })).toEqual(
        '🚆 4 minutes by walking',
      );
    });

    test('with only buses', () => {
      const rides = [bus, { line: '41', vehicle: 'bus' } as const];
      expect(formatRoute({ mode: 'transit', timeMinutes: 6, rides })).toEqual(
        '🚌 6 minutes on the 40 bus -> 41 bus',
      );
    });

    test('with only trains', () => {
      const rides = [train, { line: '4', vehicle: 'train' } as const];
      expect(formatRoute({ mode: 'transit', timeMinutes: 6, rides })).toEqual(
        '🚆 6 minutes on the Harlem -> 4',
      );
    });

    test('with a bus and a train', () => {
      expect(formatRoute({ mode: 'transit', timeMinutes: 6, rides: [bus, train] })).toEqual(
        '🚆 6 minutes on the 40 bus -> Harlem',
      );
    });
  });

  describe('with a label', () => {
    test('puts it after the icon', () => {
      const route = {
        mode: 'transit',
        timeMinutes: 14,
        rides: [{ line: '60', vehicle: 'bus' }],
      } as const;
      expect(formatRoute(route, { label: 'Friday 6:15 pm' })).toEqual(
        '🚌 Friday 6:15 pm: 14 minutes on the 60 bus',
      );
    });

    test('labels a missing route too', () => {
      expect(
        formatRoute({ mode: 'unavailable', tripMode: 'transit' }, { label: 'Saturday 9:30 am' }),
      ).toEqual('🚆 Saturday 9:30 am: No transit route');
    });
  });

  test('unavailable', () => {
    expect(formatRoute({ mode: 'unavailable', tripMode: 'walk' })).toEqual('🚶 No walking route');
    expect(formatRoute({ mode: 'unavailable', tripMode: 'bike' })).toEqual('🚴 No bike route');
    expect(formatRoute({ mode: 'unavailable', tripMode: 'transit' })).toEqual(
      '🚆 No transit route',
    );
    expect(formatRoute({ mode: 'unavailable', tripMode: 'drive' })).toEqual('🚗 No driving route');
  });
});
