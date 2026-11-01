import { describe, expect, it } from 'vitest';

import { type CoordinatePoint, computeClosestPoint, haversineDistance } from './closestDest';

describe('haversineDistance', () => {
  it('should return 0 for identical points', () => {
    const point = { latitude: 40.7128, longitude: -74.006 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it('should calculate distance between New York and London accurately', () => {
    const newYork = { latitude: 40.7128, longitude: -74.006 };
    const london = { latitude: 51.5074, longitude: -0.1278 };
    const distance = haversineDistance(newYork, london);
    expect(distance).toBeCloseTo(5570, 0);
  });
});

describe('computeClosestPoint', () => {
  it('should return null for empty candidates array', () => {
    const origin = { latitude: 40.7128, longitude: -74.006 };
    const candidates: Array<CoordinatePoint> = [];
    expect(computeClosestPoint(origin, candidates)).toBeNull();
  });

  it('should return the only candidate when array has single element', () => {
    const origin = { latitude: 40.7128, longitude: -74.006 };
    const singleCandidate = { latitude: 34.0522, longitude: -118.2437 };
    expect(computeClosestPoint(origin, [singleCandidate])).toBe(singleCandidate);
  });

  it('should find the closest point among multiple candidates', () => {
    const newYork = { latitude: 40.7128, longitude: -74.006 };
    const candidates = [
      { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
      { latitude: 41.8781, longitude: -87.6298 }, // Chicago
      { latitude: 42.3601, longitude: -71.0589 }, // Boston
      { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
    ];
    // Boston is closest to New York
    const closest = computeClosestPoint(newYork, candidates);
    expect(closest).toEqual({ latitude: 42.3601, longitude: -71.0589 });
  });

  it('should handle points that are very close to each other', () => {
    const origin = { latitude: 40.7128, longitude: -74.006 };
    const candidates = [
      { latitude: 40.7135, longitude: -74.007 }, // Very close point A
      { latitude: 40.713, longitude: -74.0062 }, // Closest point
      { latitude: 40.714, longitude: -74.008 }, // Very close point B
    ];

    const closest = computeClosestPoint(origin, candidates);
    expect(closest).toEqual({ latitude: 40.713, longitude: -74.0062 });
  });
});
