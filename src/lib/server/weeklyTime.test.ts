import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DayOfWeek, nextOccurrence } from './weeklyTime';

describe('nextOccurrence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('on a Tuesday morning', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2023-04-11T10:30:45.678-04:00'));
    });

    test.each([
      ['later this week', DayOfWeek.Wednesday, 15, 30, '2023-04-12T15:30:00.000-04:00'],
      ['earlier in the week', DayOfWeek.Monday, 10, 0, '2023-04-17T10:00:00.000-04:00'],
      ['earlier today', DayOfWeek.Tuesday, 9, 0, '2023-04-18T09:00:00.000-04:00'],
      ['later today', DayOfWeek.Tuesday, 15, 0, '2023-04-18T15:00:00.000-04:00'],
    ])('lands on the next one for a time %s', (_, day, hour, minute, expected) => {
      expect(nextOccurrence({ day, hour, minute }).toISO()).toBe(expected);
    });
  });

  describe('across the start of daylight saving time', () => {
    test('keeps the local time', () => {
      vi.setSystemTime(new Date('2024-03-10T01:30:00-05:00'));

      expect(nextOccurrence({ day: DayOfWeek.Monday, hour: 14, minute: 30 }).toISO()).toBe(
        '2024-03-11T14:30:00.000-04:00',
      );
    });
  });
});
