import type { DestinationResult, Place, Route } from '#lib/types.ts';
import { type Coordinates, closest } from './closest';
import { type Destination, ORIGIN_COUNTY } from './destinations';
import { geocode } from './gmapsGeocoding';
import { computeRoute, type RouteOptions } from './gmapsRouting';

export interface Maps {
  geocode(address: string, expectedCounty: string): Promise<Coordinates>;
  computeRoute(options: RouteOptions): Promise<Route>;
}

export function googleMaps(key: string): Maps {
  return {
    geocode: (address, expectedCounty) => geocode(key, address, expectedCounty),
    computeRoute: (options) => computeRoute(key, options),
  };
}

function resolvePlace(
  place: Destination['place'],
  originPoint: Coordinates,
): { address: string; closest: Place | null } {
  if ('address' in place) {
    return { address: place.address, closest: null };
  }
  const { name, address } = closest(originPoint, place.closestOf);
  return { address, closest: { name } };
}

export async function computeTravelTimes(
  origin: string,
  destinations: readonly Destination[],
  maps: Maps,
): Promise<DestinationResult[]> {
  const originPoint = await maps.geocode(origin, ORIGIN_COUNTY);

  return await Promise.all(
    destinations.map(async ({ id, title, goal, place, trips }) => {
      const { address, closest } = resolvePlace(place, originPoint);
      const routes = await Promise.all(
        trips.map((trip) => maps.computeRoute({ origin, dest: address, trip })),
      );
      return { id, title, goal, closest, routes };
    }),
  );
}
