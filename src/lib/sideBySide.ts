import type { ApartmentDetails } from '#lib/apartmentDetails.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import type ApartmentStatus from '#lib/server/db/schema/public/ApartmentStatus.ts';
import type { Goal, GoalStatus, Route, TripMode } from '#lib/types.ts';

export type Pair<T> = [T, T];

export interface ApartmentChoice {
  id: ApartmentId;
  address: string;
  unit: string | null;
  status: ApartmentStatus;
}

export type ComparedApartment = ApartmentChoice &
  Pick<ApartmentDetails, 'rent' | 'nextStep' | 'listingUrl'>;

export type SideTrip =
  | { kind: 'missing' } // The snapshot predates the destination or its trips.
  | { kind: 'trip'; route: Route; status?: GoalStatus };

export interface PairedTrip {
  mode: TripMode;
  label?: string;
  goal?: Goal;
  sides: Pair<SideTrip>;
}

export interface PairedDestination {
  id: string;
  title: string;
  closest: Pair<string | null>; // The place picked for each side, when picked from several.
  trips: PairedTrip[];
}

export function pairMap<T, U>([a, b]: Pair<T>, f: (value: T) => U): Pair<U> {
  return [f(a), f(b)];
}

/** How much lower `value` is than `other`, for minutes and rent alike, where lower is better. */
export function amountLower(value: number | null, other: number | null): number | undefined {
  if (value === null || other === null || value >= other) return undefined;
  return other - value;
}

export function routeMinutes(side: SideTrip): number | null {
  if (side.kind === 'missing' || side.route.mode === 'unavailable') return null;
  return side.route.timeMinutes;
}

// `''` with neither chosen, so the plain link opens an empty comparison.
export function compareSearch(ids: Pair<ApartmentId | undefined>): string {
  const params = new URLSearchParams();
  for (const [name, id] of [
    ['a', ids[0]],
    ['b', ids[1]],
  ] as const) {
    if (id !== undefined) params.set(name, String(id));
  }
  const search = params.toString();
  return search && `?${search}`;
}
