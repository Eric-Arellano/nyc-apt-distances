import { describe, expect, test } from 'vitest';
import { parseApartmentId } from './params.ts';

describe('parseApartmentId', () => {
  test.each([
    ['1', 1],
    ['999999999', 999999999],
  ])('reads %s as a number', (param, expected) => {
    expect(parseApartmentId(param)).toBe(expected);
  });

  test.each(['', '0', '01', '-1', '1.5', '1e3', 'abc', '1000000000'])('refuses %j', (param) => {
    expect(parseApartmentId(param)).toBeUndefined();
  });
});
