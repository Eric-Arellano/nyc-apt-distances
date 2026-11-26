import { error } from '@sveltejs/kit';
import type { Kysely } from 'kysely';
import type { DestinationResult } from '#lib/types.ts';
import type { Coordinates } from './closest';
import type Database from './db/schema/Database.ts';
import type { ApartmentId } from './db/schema/public/Apartment.ts';
import { DESTINATIONS, ORIGIN_COUNTY } from './destinations';
import type { Maps } from './maps';
import { computeTravelTimes, type TravelTimeEntry, toDestinationResults } from './travelTimes';

type Db = Kysely<Database>;

export interface ApartmentSummary {
  id: ApartmentId;
  address: string;
  createdAt: Date;
}

export type SaveOutcome =
  | { kind: 'saved'; id: ApartmentId }
  | { kind: 'duplicate'; existing: ApartmentSummary };

export interface ApartmentView {
  id: ApartmentId;
  address: string;
  travelTimesComputedAt: Date;
  results: DestinationResult[];
  missing: string[]; // Titles of destinations the snapshot has no current entry for.
}

async function computeSnapshot(address: string, coordinates: Coordinates, maps: Maps) {
  const entries = await computeTravelTimes(address, coordinates, DESTINATIONS, maps);
  return { travelTimes: JSON.stringify(entries), travelTimesComputedAt: new Date() };
}

export async function saveApartment(
  db: Db,
  maps: Maps,
  address: string,
  { allowDuplicate }: { allowDuplicate: boolean },
): Promise<SaveOutcome> {
  const { placeId, coordinates } = await maps.geocode(address, ORIGIN_COUNTY);

  // Checked before routing, so finding a saved apartment again costs one geocode, not every route.
  if (!allowDuplicate) {
    const existing = await db
      .selectFrom('apartment')
      .select(['id', 'address', 'createdAt'])
      .where('placeId', '=', placeId)
      .orderBy('id')
      .executeTakeFirst();
    if (existing) return { kind: 'duplicate', existing };
  }

  const { id } = await db
    .insertInto('apartment')
    .values({ address, placeId, ...(await computeSnapshot(address, coordinates, maps)) })
    .returning('id')
    .executeTakeFirstOrThrow();
  return { kind: 'saved', id };
}

// Replaces the whole snapshot, so `travelTimesComputedAt` stays true of every entry.
export async function recomputeApartment(db: Db, maps: Maps, id: ApartmentId): Promise<void> {
  const row = await db
    .selectFrom('apartment')
    .select('address')
    .where('id', '=', id)
    .executeTakeFirst();
  if (!row) error(404, 'No saved apartment has that link.');

  const { placeId, coordinates } = await maps.geocode(row.address, ORIGIN_COUNTY);
  await db
    .updateTable('apartment')
    .set({ placeId, ...(await computeSnapshot(row.address, coordinates, maps)) })
    .where('id', '=', id)
    .execute();
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

export async function listApartments(db: Db): Promise<ApartmentSummary[]> {
  return await db
    .selectFrom('apartment')
    .select(['id', 'address', 'createdAt'])
    .orderBy('id', 'desc')
    .execute();
}
