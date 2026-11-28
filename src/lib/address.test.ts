import { describe, expect, test } from 'vitest';
import { formatUnit, isValidAddress, parseUnit, streetPart, withUnit } from '#lib/address.ts';

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

describe('isValidAddress', () => {
  test.each([
    ['', false],
    ['123', false],
    ['West 123', false],
    ['123 W', true],
  ])('judges %j valid: %s', (address, valid) => {
    expect(isValidAddress(address)).toBe(valid);
  });
});

describe('streetPart', () => {
  test.each([
    ['12 Juniper Row, White Plains, NY 10601', '12 Juniper Row'],
    ['12 Juniper Row', '12 Juniper Row'],
  ])('takes %j up to the first comma', (address, expected) => {
    expect(streetPart(address)).toBe(expected);
  });
});
