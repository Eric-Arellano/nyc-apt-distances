import { describe, expect, test } from 'vitest';
import type { ApartmentId } from './server/db/schema/public/Apartment.ts';
import { amountLower, compareSearch, routeMinutes } from './sideBySide';

describe('amountLower', () => {
  test.each([
    [10, 16, 6],
    [16, 10, undefined],
    [10, 10, undefined],
    [null, 10, undefined],
    [10, null, undefined],
  ])('%j against %j', (value, other, expected) => {
    expect(amountLower(value, other)).toBe(expected);
  });
});

describe('routeMinutes', () => {
  test('reads a route’s time', () => {
    const route = { mode: 'walk', timeMinutes: 12, distanceMiles: 0.8 } as const;
    expect(routeMinutes({ kind: 'trip', route })).toBe(12);
  });

  test('has none for no route or a missing trip', () => {
    const route = { mode: 'unavailable', tripMode: 'transit' } as const;
    expect(routeMinutes({ kind: 'trip', route, status: 'unmet' })).toBeNull();
    expect(routeMinutes({ kind: 'missing' })).toBeNull();
  });
});

describe('compareSearch', () => {
  test.each([
    [[1, 2], '?a=1&b=2'],
    [[1, undefined], '?a=1'],
    [[undefined, 2], '?b=2'],
    [[undefined, undefined], ''],
  ] as const)('%j', (ids, expected) => {
    expect(compareSearch(ids as [ApartmentId | undefined, ApartmentId | undefined])).toBe(expected);
  });
});
