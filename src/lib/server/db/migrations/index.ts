// Listed by hand rather than read from this directory, so the same list works under Vite, Vitest
// and plain Node. Kysely runs them in key order.
//
// A migration that has landed is never edited: production has already run it. Change the schema
// with a new one, then run `npm run db:types`.
import type { Migration } from 'kysely/migration';
import * as createApartment from './001-create-apartment.ts';

export const MIGRATIONS: Record<string, Migration> = {
  '001-create-apartment': createApartment,
};
