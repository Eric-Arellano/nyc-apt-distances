export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Great-circle distance in kilometres, by the haversine formula.
export function haversineDistance(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const diffLat = lat2 - lat1;
  const diffLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(diffLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(diffLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function closest<T extends Coordinates>(
  origin: Coordinates,
  [first, ...rest]: readonly [T, ...T[]],
): T {
  return rest.reduce(
    (best, candidate) =>
      haversineDistance(origin, candidate) < haversineDistance(origin, best) ? candidate : best,
    first,
  );
}
