// Listed by hand rather than read from this directory, so the same list works under Vite, Vitest
// and plain Node. Kysely runs them in key order.
//
// A migration that has landed is never edited: production has already run it. Change the schema
// with a new one, then run `npm run db:types`.
import type { Migration } from 'kysely/migration';
import * as createApartment from './001-create-apartment.ts';
import * as addApartmentPlaceId from './002-add-apartment-place-id.ts';
import * as addApartmentUnit from './003-add-apartment-unit.ts';
import * as addApartmentTracking from './004-add-apartment-tracking.ts';

export const MIGRATIONS: Record<string, Migration> = {
  '001-create-apartment': createApartment,
  '002-add-apartment-place-id': addApartmentPlaceId,
  '003-add-apartment-unit': addApartmentUnit,
  '004-add-apartment-tracking': addApartmentTracking,
};
