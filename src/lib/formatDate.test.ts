import { describe, expect, test } from 'vitest';
import { formatDate } from './formatDate.ts';

describe('formatDate', () => {
  test("uses New York's day, not UTC's", () => {
    expect(formatDate(new Date('2026-11-25T03:00:00Z'))).toBe('Nov 24, 2026');
  });
});
