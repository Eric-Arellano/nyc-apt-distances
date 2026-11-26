import { createHash } from 'node:crypto';
import type { DestinationResult, Place, Route } from '#lib/types.ts';
import { type Coordinates, closest } from './closest';
import type { Destination } from './destinations';
import type { Maps } from './maps';

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
 * storing: titles and goals can change in code without invalidating it. It is stored as is in
 * `apartment.travel_times`, so a change that stored rows don't satisfy needs a migration of them.
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

// Routes start from `origin` as typed; `originPoint`, its geocode, only picks the closest places.
export async function computeTravelTimes(
  origin: string,
  originPoint: Coordinates,
  destinations: readonly Destination[],
  maps: Pick<Maps, 'computeRoute'>,
): Promise<TravelTimeEntry[]> {
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
 * destination was removed from code is dropped. A destination with no entry, or whose entry was
 * computed for a different place or trips, is `missing`, by title.
 */
export function toDestinationResults(
  entries: readonly TravelTimeEntry[],
  destinations: readonly Destination[],
): { results: DestinationResult[]; missing: string[] } {
  const current = destinations.map((destination) => ({
    destination,
    entry: entries.find(
      (candidate) =>
        candidate.id === destination.id && candidate.fingerprint === fingerprint(destination),
    ),
  }));
  return {
    results: current.flatMap(({ destination: { id, title, goal }, entry }) =>
      entry ? [{ id, title, goal, closest: entry.closest, routes: entry.routes }] : [],
    ),
    missing: current.filter(({ entry }) => !entry).map(({ destination }) => destination.title),
  };
}
