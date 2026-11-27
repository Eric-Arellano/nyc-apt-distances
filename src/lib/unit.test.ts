import { describe, expect, test } from 'vitest';
import { formatUnit, parseUnit, withUnit } from '#lib/unit.ts';

describe('parseUnit', () => {
  test.each([
    ['4B', '4B'],
    [' 4B ', '4B'],
    ['Unit 4B', '4B'],
    ['apt. 4B', '4B'],
    ['Apartment 4B', '4B'],
    ['#4B', '4B'],
    ['Apt', null],
    ['', null],
    ['Aptos 2', 'Aptos 2'],
    ['PH', 'PH'],
  ])('reads %j as %j', (text, unit) => {
    expect(parseUnit(text)).toBe(unit);
  });
});

describe('withUnit', () => {
  test('follows the address with its unit', () => {
    expect(withUnit('1 Main St', '4B')).toBe('1 Main St, Unit 4B');
  });

  test('is the bare address without a unit', () => {
    expect(withUnit('1 Main St', null)).toBe('1 Main St');
  });
});

describe('formatUnit', () => {
  test('names it a unit', () => {
    expect(formatUnit('4B')).toBe('Unit 4B');
  });
});
