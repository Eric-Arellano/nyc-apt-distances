import { describe, expect, test } from 'vitest';
import { COMPARISON_GROUPS, DESTINATIONS } from './destinations';

describe('COMPARISON_GROUPS', () => {
  test('names destinations that exist, once each', () => {
    const ids = COMPARISON_GROUPS.map(({ destinationId }) => destinationId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !DESTINATIONS.some((d) => d.id === id))).toEqual([]);
  });

  test.each(COMPARISON_GROUPS)(
    'names distinct trips of $destinationId',
    ({ destinationId, columns }) => {
      const trips = DESTINATIONS.find(({ id }) => id === destinationId)?.trips ?? [];
      const indexes = columns.map(({ tripIndex }) => tripIndex);
      expect(new Set(indexes).size).toBe(indexes.length);
      expect(indexes.every((index) => index >= 0 && index < trips.length)).toBe(true);
    },
  );
});
