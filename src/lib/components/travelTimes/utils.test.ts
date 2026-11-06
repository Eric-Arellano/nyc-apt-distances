import { describe, expect, test } from 'vitest';
import type { Route } from '#lib/types.ts';
import { formatRoute, goalStatus, goalText } from './utils.js';

describe('goalStatus', () => {
  const goal = { strictness: 'must', idealMinutes: 5, maxMinutes: 10 } as const;
  function walk(timeMinutes: number): Route {
    return { mode: 'walk', timeMinutes, distanceMiles: 1 };
  }
  const noTransit: Route = { mode: 'unavailable', tripMode: 'transit' };

  test('grades the fastest route against the goal', () => {
    expect(goalStatus([walk(4)], goal)).toEqual('met');
    expect(goalStatus([walk(5)], goal)).toEqual('met');
    expect(goalStatus([walk(6)], goal)).toEqual('partial');
    expect(goalStatus([walk(10)], goal)).toEqual('partial');
    expect(goalStatus([walk(11)], goal)).toEqual('unmet');
    expect(goalStatus([walk(8), walk(44)], goal)).toEqual('partial');
    expect(goalStatus([walk(20), walk(44)], goal)).toEqual('unmet');
  });

  describe('with an unavailable route', () => {
    test('grades the available routes', () => {
      expect(goalStatus([noTransit, walk(4)], goal)).toEqual('met');
    });

    test('is unmet when no route is available', () => {
      expect(goalStatus([noTransit], goal)).toEqual('unmet');
    });
  });
});

describe('goalText', () => {
  const walk = { mode: 'walk', timeMinutes: 4, distanceMiles: 2.1 } as const;
  const transit = { mode: 'transit', timeMinutes: 4, summary: null } as const;

  test('names a walk when every route walks', () => {
    expect(goalText({ strictness: 'must', idealMinutes: 7, maxMinutes: 12 }, [walk])).toEqual(
      'Must be within a 12-minute walk; ideally within 7 minutes',
    );
  });

  test('gives only minutes when any route is not a walk', () => {
    expect(
      goalText({ strictness: 'should', idealMinutes: 40, maxMinutes: 55 }, [transit, walk]),
    ).toEqual('Should be within 55 minutes; ideally within 40 minutes');
  });

  test('reads an unavailable route by the mode it was for', () => {
    const goal = { strictness: 'must', idealMinutes: 7, maxMinutes: 12 } as const;
    expect(goalText(goal, [{ mode: 'unavailable', tripMode: 'walk' }])).toEqual(
      'Must be within a 12-minute walk; ideally within 7 minutes',
    );
    expect(goalText(goal, [walk, { mode: 'unavailable', tripMode: 'transit' }])).toEqual(
      'Must be within 12 minutes; ideally within 7 minutes',
    );
  });
});

describe('formatRoute', () => {
  test('bike', () => {
    expect(formatRoute({ mode: 'bike', timeMinutes: 4, distanceMiles: 2.1 })).toEqual(
      '🚴 4 minutes (2.1 miles)',
    );
  });

  test('walk', () => {
    expect(formatRoute({ mode: 'walk', timeMinutes: 4, distanceMiles: 2.1 })).toEqual(
      '🚶 4 minutes (2.1 miles)',
    );
    expect(
      formatRoute({ mode: 'walk', timeMinutes: 10, distanceMiles: 0.5 }, { name: 'Central Park' }),
    ).toEqual('🚶 10 minutes to Central Park (0.5 miles)');
    expect(
      formatRoute(
        { mode: 'walk', timeMinutes: 15, distanceMiles: 0.7 },
        { name: 'Union Square Station', additionalInfo: 'with N, Q, R lines' },
      ),
    ).toEqual('🚶 15 minutes to Union Square Station with N, Q, R lines (0.7 miles)');
  });

  test('transit', () => {
    expect(formatRoute({ mode: 'transit', timeMinutes: 4, summary: null })).toEqual(
      '🚇 4 minutes by walking',
    );
    expect(formatRoute({ mode: 'transit', timeMinutes: 6, summary: '6 -> 7' })).toEqual(
      '🚇 6 minutes on the 6 -> 7',
    );
  });

  test('unavailable', () => {
    expect(formatRoute({ mode: 'unavailable', tripMode: 'walk' })).toEqual('🚶 No walking route');
    expect(formatRoute({ mode: 'unavailable', tripMode: 'bike' })).toEqual('🚴 No bike route');
    expect(formatRoute({ mode: 'unavailable', tripMode: 'transit' })).toEqual(
      '🚇 No transit route',
    );
  });
});
