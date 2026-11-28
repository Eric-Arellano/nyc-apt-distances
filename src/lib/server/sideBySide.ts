import { goalStatus } from '#lib/goalStatus.ts';
import { type Pair, type PairedDestination, pairMap, type SideTrip } from '#lib/sideBySide.ts';
import type { DestinationResult, TripResult } from '#lib/types.ts';
import type { Destination } from './destinations.ts';

function sideTrip(trip: TripResult | undefined): SideTrip {
  if (!trip) return { kind: 'missing' };
  const { route, goal } = trip;
  return { kind: 'trip', route, status: goal && goalStatus(route, goal) };
}

/**
 * Lines up two apartments' results by destination and trip position, in `destinations`' order,
 * so a trip one snapshot lacks is a gap on that side rather than shifting the rest. A trip is
 * named by position, not mode, since Bet Am Shalom has a bus on each of two days.
 */
export function pairDestinations(
  destinations: readonly Destination[],
  results: Pair<readonly DestinationResult[]>,
): PairedDestination[] {
  return destinations.map(({ id, title, trips }) => {
    const found = pairMap(results, (list) => list.find((result) => result.id === id));
    return {
      id,
      title,
      closest: pairMap(found, (result) => result?.closest?.name ?? null),
      trips: trips.map(({ trip, goal, label }, index) => ({
        mode: trip.mode,
        label,
        goal,
        sides: pairMap(found, (result) => sideTrip(result?.trips[index])),
      })),
    };
  });
}
