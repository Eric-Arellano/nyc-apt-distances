import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DayOfWeek, getNextDateTime, type TargetDate } from './departureTime';

describe('getNextDateTime', () => {
  beforeEach(() => {
    vi.spyOn(DateTime, 'now').mockImplementation(
      // April 11, 2023 was a Tuesday
      () => DateTime.fromISO('2023-04-11T10:30:00', { zone: 'America/New_York' }) as DateTime<true>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an error when fromDate has an invalid timezone', () => {
    const target: TargetDate = {
      day: DayOfWeek.Wednesday,
      hour: 15,
      minute: 30,
    };
    const invalidFromDate = DateTime.now().setZone('Europe/London') as DateTime<true>;
    expect(() => getNextDateTime(target, invalidFromDate)).toThrow(
      'Invalid timezone for input date',
    );
  });

  it('returns the correct date when target day is later in the same week', () => {
    const target: TargetDate = {
      day: DayOfWeek.Wednesday,
      hour: 15,
      minute: 30,
    };
    const result = getNextDateTime(target);
    expect(result.weekday).toBe(DayOfWeek.Wednesday);
    expect(result.hour).toBe(15);
    expect(result.minute).toBe(30);
    expect(result.toISODate()).toBe('2023-04-12');
  });

  it('returns the date for next week when target day is earlier in the week', () => {
    // We're on Tuesday, so Monday already passed.
    const target: TargetDate = {
      day: DayOfWeek.Monday,
      hour: 10,
      minute: 0,
    };
    const result = getNextDateTime(target);
    expect(result.weekday).toBe(DayOfWeek.Monday);
    expect(result.hour).toBe(10);
    expect(result.minute).toBe(0);
    expect(result.toISODate()).toBe('2023-04-17');
  });

  it('returns the date for next week when target day is the same as current day', () => {
    const target: TargetDate = {
      day: DayOfWeek.Tuesday,
      hour: 9,
      minute: 0,
    };
    const result = getNextDateTime(target);
    expect(result.weekday).toBe(DayOfWeek.Tuesday);
    expect(result.hour).toBe(9);
    expect(result.minute).toBe(0);
    expect(result.toISODate()).toBe('2023-04-18');
  });

  it('handles DST boundaries correctly', () => {
    // March 10, 2024 (just before DST begins in the US)
    const beforeDST = DateTime.fromISO('2024-03-10T01:30:00', {
      zone: 'America/New_York',
    }) as DateTime<true>;
    const target: TargetDate = {
      day: DayOfWeek.Monday,
      hour: 14,
      minute: 30,
    };
    const result = getNextDateTime(target, beforeDST);
    expect(result.weekday).toBe(DayOfWeek.Monday);
    expect(result.hour).toBe(14);
    expect(result.minute).toBe(30);
    expect(result.toISODate()).toBe('2024-03-11');
    expect(result.zoneName).toBe('America/New_York');
  });
});
