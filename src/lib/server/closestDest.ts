export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the distance in kilometers between two points using the Haversine formula
 */
export function haversineDistance(point1: CoordinatePoint, point2: CoordinatePoint): number {
  const EARTH_RADIUS_KM = 6371;

  // Convert latitude and longitude from degrees to radians
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lon1 = (point1.longitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const lon2 = (point2.longitude * Math.PI) / 180;

  const diffLat = lat2 - lat1;
  const diffLon = lon2 - lon1;

  // Haversine formula
  const a =
    Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(diffLon / 2) * Math.sin(diffLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Computes the closest point from a list of candidates to the origin point.
 */
export function computeClosestPoint<T extends CoordinatePoint>(
  origin: CoordinatePoint,
  candidates: Array<T>,
): T | null {
  const [first, ...rest] = candidates;
  if (!first) return null;

  return rest.reduce(
    (closest, point) =>
      haversineDistance(origin, point) < haversineDistance(origin, closest) ? point : closest,
    first,
  );
}

export function findClosest<T extends CoordinatePoint>(
  originPoint: CoordinatePoint,
  candidates: Array<T>,
): T {
  const closest = computeClosestPoint(originPoint, candidates);
  if (!closest) throw new Error('Must provide at least one candidate');
  return closest;
}
