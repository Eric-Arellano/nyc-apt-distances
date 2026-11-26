import type { Kysely } from 'kysely';
import type { DestinationResult } from '#lib/types.ts';
import type Database from './db/schema/Database.ts';
import type { ApartmentId } from './db/schema/public/Apartment.ts';
import { DESTINATIONS } from './destinations';
import { type TravelTimeEntry, toDestinationResults } from './travelTimes';

type Db = Kysely<Database>;

export interface ApartmentView {
  id: ApartmentId;
  address: string;
  travelTimesComputedAt: Date;
  results: DestinationResult[];
  missing: string[]; // Titles of destinations the snapshot has no current entry for.
}

export async function getApartment(db: Db, id: ApartmentId): Promise<ApartmentView | undefined> {
  const row = await db
    .selectFrom('apartment')
    .select(['id', 'address', 'travelTimes', 'travelTimesComputedAt'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!row) return undefined;

  const { travelTimes, ...rest } = row;
  // Kanel types `jsonb` reads as `unknown`. The column holds what `computeTravelTimes` returned.
  return { ...rest, ...toDestinationResults(travelTimes as TravelTimeEntry[], DESTINATIONS) };
}
