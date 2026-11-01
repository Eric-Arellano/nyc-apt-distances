import { expect, test } from 'vitest';
import { isValidAddress } from './addressUtils.js';

test('isValidAddress', () => {
  expect(isValidAddress('')).toBe(false);
  expect(isValidAddress('123')).toBe(false);
  expect(isValidAddress('West 123')).toBe(false);
  expect(isValidAddress('123 W')).toBe(true);
});
