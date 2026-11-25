import type { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

/** Identifier type for public.apartment */
export type ApartmentId = number & { __brand: 'public.apartment' };

/** Represents the table public.apartment */
export default interface ApartmentTable {
  id: ColumnType<ApartmentId, never, never>;

  address: ColumnType<string, string, string>;

  /** A snapshot of the travel times to each destination, one array entry per destination. */
  travelTimes: ColumnType<unknown, string, string>;

  /** When the travel times were computed. Destinations live in code, so they may have changed since. */
  travelTimesComputedAt: ColumnType<Date, Date | string, Date | string>;

  createdAt: ColumnType<Date, Date | string | undefined, Date | string>;

  /** Google's id for the geocoded address. Saving a place that is already saved asks first. */
  placeId: ColumnType<string, string, string>;
}

export type Apartment = Selectable<ApartmentTable>;

export type NewApartment = Insertable<ApartmentTable>;

export type ApartmentUpdate = Updateable<ApartmentTable>;
