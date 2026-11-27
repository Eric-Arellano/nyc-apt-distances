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
  unit: string | null;
  createdAt: Date;
}

export type SaveOutcome =
  | { kind: 'saved'; id: ApartmentId }
  // Every apartment in the building that could be this one, oldest first.
  | { kind: 'duplicate'; existing: ApartmentSummary[] };

const SUMMARY_COLUMNS = ['id', 'address', 'unit', 'createdAt'] as const;

export interface ApartmentView {
  id: ApartmentId;
  address: string;
  unit: string | null;
  travelTimesComputedAt: Date;
  results: DestinationResult[];
  missing: string[]; // Titles of destinations the snapshot has no current entry for.
}

async function computeSnapshot(address: string, coordinates: Coordinates, maps: Maps) {
  const entries = await computeTravelTimes(address, coordinates, DESTINATIONS, maps);
  return { travelTimes: JSON.stringify(entries), travelTimesComputedAt: new Date() };
}

// A missing unit could be any unit, since most lookups are typed without one.
function couldBeSameUnit(a: string | null, b: string | null): boolean {
  return a === null || b === null || a.toLowerCase() === b.toLowerCase();
}

export async function saveApartment(
  db: Db,
  maps: Maps,
  {
    address,
    unit,
    allowDuplicate,
  }: { address: string; unit: string | null; allowDuplicate: boolean },
): Promise<SaveOutcome> {
  const { placeId, coordinates } = await maps.geocode(address, ORIGIN_COUNTY);

  // The unit isn't geocoded, so every unit in a building shares its `place_id`; the unit tells
  // them apart.
  const building = await db
    .selectFrom('apartment')
    .select([...SUMMARY_COLUMNS, 'travelTimes', 'travelTimesComputedAt'])
    .where('placeId', '=', placeId)
    .orderBy('id')
    .execute();

  // Checked before routing, so finding a saved apartment again costs one geocode, not every route.
  if (!allowDuplicate) {
    const existing = building
      .filter((saved) => couldBeSameUnit(saved.unit, unit))
      .map(({ travelTimes, travelTimesComputedAt, ...summary }) => summary);
    if (existing.length > 0) return { kind: 'duplicate', existing };
  }

  // Every unit in a building has the same travel times, so another unit copies the newest snapshot,
  // stale or not, rather than paying for every route again. Its page offers to recalculate.
  const neighbor = building.at(-1);
  const snapshot = neighbor
    ? {
        travelTimes: JSON.stringify(neighbor.travelTimes),
        travelTimesComputedAt: neighbor.travelTimesComputedAt,
      }
    : await computeSnapshot(address, coordinates, maps);

  const { id } = await db
    .insertInto('apartment')
    .values({ address, unit, placeId, ...snapshot })
    .returning('id')
    .executeTakeFirstOrThrow();
  return { kind: 'saved', id };
}

/** Replaces the whole snapshot, so `travelTimesComputedAt` stays true of every entry. */
export async function recomputeApartment(db: Db, maps: Maps, id: ApartmentId): Promise<void> {
  const saved = await db
    .selectFrom('apartment')
    .select('address')
    .where('id', '=', id)
    .executeTakeFirst();
  if (!saved) error(404, 'No saved apartment has that link.');

  const { placeId, coordinates } = await maps.geocode(saved.address, ORIGIN_COUNTY);
  await db
    .updateTable('apartment')
    .set({ placeId, ...(await computeSnapshot(saved.address, coordinates, maps)) })
    .where('id', '=', id)
    .execute();
}

// Deleting an apartment already gone succeeds, since the other person may have just deleted it.
export async function deleteApartment(db: Db, id: ApartmentId): Promise<void> {
  await db.deleteFrom('apartment').where('id', '=', id).execute();
}

export async function getApartment(db: Db, id: ApartmentId): Promise<ApartmentView | undefined> {
  const row = await db
    .selectFrom('apartment')
    .select(['id', 'address', 'unit', 'travelTimes', 'travelTimesComputedAt'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!row) return undefined;

  const { travelTimes, ...rest } = row;
  // Kanel types `jsonb` reads as `unknown`. The column holds what `computeTravelTimes` returned.
  return { ...rest, ...toDestinationResults(travelTimes as TravelTimeEntry[], DESTINATIONS) };
}

export async function listApartments(db: Db): Promise<ApartmentSummary[]> {
  return await db.selectFrom('apartment').select(SUMMARY_COLUMNS).orderBy('id', 'desc').execute();
}
