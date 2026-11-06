import { describe, expect, test } from 'vitest';
import { closest, haversineDistance } from './closest';

const COUNTY_OFFICE = { latitude: 41.03036, longitude: -73.769965 };
const WHITE_PLAINS_STATION = { latitude: 41.033309, longitude: -73.775206 };
const NORTH_WHITE_PLAINS_STATION = { latitude: 41.051272, longitude: -73.772478 };
const HARTSDALE_STATION = { latitude: 41.011048, longitude: -73.795569 };

describe('haversineDistance', () => {
  test('is zero between identical points', () => {
    expect(haversineDistance(COUNTY_OFFICE, COUNTY_OFFICE)).toBe(0);
  });

  test('measures in kilometres', () => {
    expect(haversineDistance(COUNTY_OFFICE, NORTH_WHITE_PLAINS_STATION)).toBeCloseTo(2.33, 2);
  });

  test('is symmetric', () => {
    expect(haversineDistance(HARTSDALE_STATION, COUNTY_OFFICE)).toBe(
      haversineDistance(COUNTY_OFFICE, HARTSDALE_STATION),
    );
  });
});

describe('closest', () => {
  test('returns the only candidate', () => {
    expect(closest(COUNTY_OFFICE, [HARTSDALE_STATION])).toBe(HARTSDALE_STATION);
  });

  test.each([
    ['first', [WHITE_PLAINS_STATION, NORTH_WHITE_PLAINS_STATION, HARTSDALE_STATION]],
    ['middle', [NORTH_WHITE_PLAINS_STATION, WHITE_PLAINS_STATION, HARTSDALE_STATION]],
    ['last', [NORTH_WHITE_PLAINS_STATION, HARTSDALE_STATION, WHITE_PLAINS_STATION]],
  ] as const)('finds the nearest candidate when it is %s', (_, candidates) => {
    expect(closest(COUNTY_OFFICE, candidates)).toBe(WHITE_PLAINS_STATION);
  });
});
