import type { DestinationResult, Place } from '#lib/types.ts';
import { type CoordinatePoint, findClosest } from './closestDest';
import { DESTINATIONS, type Destination, ORIGIN_SUFFIX } from './destinations';
import type { geocode } from './gmapsGeocoding';
import type { computeRoute } from './gmapsRouting';

export interface Maps {
  geocode: typeof geocode;
  computeRoute: typeof computeRoute;
}

function resolvePlace(
  place: Destination['place'],
  originPoint: CoordinatePoint,
): { address: string; closest: Place | null } {
  if ('address' in place) {
    return { address: place.address, closest: null };
  }
  const { name, address, lines } = findClosest(originPoint, place.closestOf);
  return {
    address,
    closest: lines ? { name, additionalInfo: `with ${lines.join(', ')}` } : { name },
  };
}

export async function computeTravelTimes(
  streetAddress: string,
  maps: Maps,
): Promise<DestinationResult[]> {
  const origin = `${streetAddress}${ORIGIN_SUFFIX}`;
  const originPoint = await maps.geocode(origin);

  return await Promise.all(
    DESTINATIONS.map(async ({ id, title, goal, place, trips }) => {
      const { address, closest } = resolvePlace(place, originPoint);
      const routes = await Promise.all(
        trips.map((trip) => maps.computeRoute({ origin, dest: address, trip })),
      );
      return { id, title, goal, closest, routes };
    }),
  );
}
