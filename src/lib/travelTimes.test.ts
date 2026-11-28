import { describe, expect, test } from 'vitest';
import { goalStatus } from './travelTimes.ts';

describe('goalStatus', () => {
  function walk(timeMinutes: number) {
    return { mode: 'walk', timeMinutes, distanceMiles: 1 } as const;
  }

  describe('with an ideal', () => {
    const goal = { strictness: 'must', idealMinutes: 5, maxMinutes: 10 } as const;

    test('is met up to the ideal', () => {
      expect(goalStatus(walk(4), goal)).toEqual('met');
      expect(goalStatus(walk(5), goal)).toEqual('met');
    });

    test('is partial past the ideal up to the max', () => {
      expect(goalStatus(walk(6), goal)).toEqual('partial');
      expect(goalStatus(walk(10), goal)).toEqual('partial');
    });

    test('is unmet past the max', () => {
      expect(goalStatus(walk(11), goal)).toEqual('unmet');
    });
  });

  describe('with only a max', () => {
    const goal = { strictness: 'should', maxMinutes: 10 } as const;

    test('is met up to the max', () => {
      expect(goalStatus(walk(10), goal)).toEqual('met');
    });

    test('is unmet past the max', () => {
      expect(goalStatus(walk(11), goal)).toEqual('unmet');
    });
  });

  test('is unmet when Google found no route', () => {
    expect(
      goalStatus(
        { mode: 'unavailable', tripMode: 'walk' },
        { strictness: 'should', maxMinutes: 99 },
      ),
    ).toEqual('unmet');
  });
});
