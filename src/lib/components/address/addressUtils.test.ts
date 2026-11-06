import { describe, expect, test } from 'vitest';
import { isValidAddress } from './addressUtils.js';

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
