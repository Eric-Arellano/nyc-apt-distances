import { describe, expect, test } from 'vitest';
import { formatRoute, goalStatus, goalText } from './utils.js';

test('goalStatus', () => {
  const targets = { strictness: 'must', idealMinutes: 5, maxMinutes: 10 } as const;
  expect(goalStatus([{ timeMinutes: 4 }], targets)).toEqual('met');
  expect(goalStatus([{ timeMinutes: 5 }], targets)).toEqual('met');
  expect(goalStatus([{ timeMinutes: 6 }], targets)).toEqual('partial');
  expect(goalStatus([{ timeMinutes: 10 }], targets)).toEqual('partial');
  expect(goalStatus([{ timeMinutes: 11 }], targets)).toEqual('unmet');
  expect(goalStatus([{ timeMinutes: 8 }, { timeMinutes: 44 }], targets)).toEqual('partial');
  expect(goalStatus([{ timeMinutes: 20 }, { timeMinutes: 44 }], targets)).toEqual('unmet');
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
});
