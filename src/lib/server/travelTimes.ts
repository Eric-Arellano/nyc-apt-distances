import { createHash } from 'node:crypto';
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

/**
 * What Google produced for one destination, and nothing that is our own copy. Only this is worth
 * storing: titles and goals can change in code without invalidating it.
 */
export interface TravelTimeEntry {
  id: string;
  fingerprint: string;
  closest: Place | null; // null: the destination is one fixed address.
  routes: Route[];
}

/**
 * Hashes what the entry's routes depend on. `routes` matches `trips` by position, so a reordered
 * trip list changes it too. Title and goal are left out on purpose.
 */
export function fingerprint({ place, trips }: Destination): string {
  return createHash('sha256').update(JSON.stringify({ place, trips })).digest('hex');
}

export async function computeTravelTimes(
  origin: string,
  destinations: readonly Destination[],
  maps: Maps,
): Promise<TravelTimeEntry[]> {
  const originPoint = await maps.geocode(origin, ORIGIN_COUNTY);

  return await Promise.all(
    destinations.map(async (destination) => {
      const { address, closest } = resolvePlace(destination.place, originPoint);
      const routes = await Promise.all(
        destination.trips.map((trip) => maps.computeRoute({ origin, dest: address, trip })),
      );
      return { id: destination.id, fingerprint: fingerprint(destination), closest, routes };
    }),
  );
}

/**
 * Pairs stored entries with the current destinations, in `destinations`' order. An entry whose
 * destination was removed from code is dropped.
 */
export function toDestinationResults(
  entries: readonly TravelTimeEntry[],
  destinations: readonly Destination[],
): DestinationResult[] {
  return destinations.flatMap(({ id, title, goal }) => {
    const entry = entries.find((candidate) => candidate.id === id);
    return entry ? [{ id, title, goal, closest: entry.closest, routes: entry.routes }] : [];
  });
}
