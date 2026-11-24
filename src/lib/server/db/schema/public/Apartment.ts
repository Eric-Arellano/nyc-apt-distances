import type { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

/** Identifier type for public.apartment */
export type ApartmentId = number & { __brand: 'public.apartment' };

/** Represents the table public.apartment */
export default interface ApartmentTable {
  id: ColumnType<ApartmentId, never, never>;

  address: ColumnType<string, string, string>;

  results: ColumnType<unknown, unknown, unknown>;

  results_computed_at: ColumnType<Date, Date | string, Date | string>;

  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type Apartment = Selectable<ApartmentTable>;

export type NewApartment = Insertable<ApartmentTable>;

export type ApartmentUpdate = Updateable<ApartmentTable>;
