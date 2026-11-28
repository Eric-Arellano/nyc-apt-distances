import { error } from '@sveltejs/kit';
import type { Kysely } from 'kysely';
import { type ApartmentDetails, changedDetails } from '#lib/apartmentDetails.ts';
import type { ApartmentRow } from '#lib/comparison.ts';
import type { ApartmentChoice } from '#lib/sideBySide.ts';
import type { DestinationResult } from '#lib/types.ts';
import type { Coordinates } from './closest.ts';
import { TABLE_GROUPS, timeCell } from './comparison.ts';
import type Database from './db/schema/Database.ts';
import type { ApartmentId } from './db/schema/public/Apartment.ts';
import type ApartmentStatus from './db/schema/public/ApartmentStatus.ts';
import { DESTINATIONS, ORIGIN_COUNTY } from './destinations.ts';
import type { Maps } from './maps/maps.ts';
import { computeTravelTimes, type TravelTimeEntry, toDestinationResults } from './travelTimes.ts';

type Db = Kysely<Database>;

const NOT_FOUND = 'No saved apartment has that link.';

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
  status: ApartmentStatus;
  details: ApartmentDetails;
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
  if (!saved) error(404, NOT_FOUND);

  const { placeId, coordinates } = await maps.geocode(saved.address, ORIGIN_COUNTY);
  await db
    .updateTable('apartment')
    .set({ placeId, ...(await computeSnapshot(saved.address, coordinates, maps)) })
    .where('id', '=', id)
    .execute();
}

export async function updateApartmentDetails(
  db: Db,
  id: ApartmentId,
  { edited, original }: { edited: ApartmentDetails; original: ApartmentDetails },
): Promise<void> {
  const changes = changedDetails(edited, original);
  if (Object.keys(changes).length === 0) return;

  const { numUpdatedRows } = await db
    .updateTable('apartment')
    .set(changes)
    .where('id', '=', id)
    .executeTakeFirstOrThrow();
  if (numUpdatedRows === 0n) error(404, NOT_FOUND);
}

export async function setApartmentStatus(
  db: Db,
  id: ApartmentId,
  status: ApartmentStatus,
): Promise<void> {
  const { numUpdatedRows } = await db
    .updateTable('apartment')
    .set({ status })
    .where('id', '=', id)
    .executeTakeFirstOrThrow();
  if (numUpdatedRows === 0n) error(404, NOT_FOUND);
}

// Deleting an apartment already gone succeeds, since the other person may have just deleted it.
export async function deleteApartment(db: Db, id: ApartmentId): Promise<void> {
  await db.deleteFrom('apartment').where('id', '=', id).execute();
}

export async function getApartment(db: Db, id: ApartmentId): Promise<ApartmentView | undefined> {
  const row = await db.selectFrom('apartment').selectAll().where('id', '=', id).executeTakeFirst();
  if (!row) return undefined;

  const { unit, rent, listingUrl, nextStep, agentContact, notes } = row;
  return {
    id: row.id,
    address: row.address,
    status: row.status,
    details: { unit, rent, listingUrl, nextStep, agentContact, notes },
    travelTimesComputedAt: row.travelTimesComputedAt,
    // Kanel types `jsonb` reads as `unknown`. The column holds what `computeTravelTimes` returned.
    ...toDestinationResults(row.travelTimes as TravelTimeEntry[], DESTINATIONS),
  };
}

// Newest first, as the table breaks ties.
export async function listApartmentChoices(db: Db): Promise<ApartmentChoice[]> {
  return await db
    .selectFrom('apartment')
    .select(['id', 'address', 'unit', 'status'])
    .orderBy('id', 'desc')
    .execute();
}

const TABLE_COLUMNS = TABLE_GROUPS.flatMap(({ columns }) => columns);

export async function listApartments(db: Db): Promise<ApartmentRow[]> {
  const rows = await db
    .selectFrom('apartment')
    .select(['id', 'address', 'unit', 'status', 'rent', 'nextStep', 'travelTimes'])
    .orderBy('id', 'desc')
    .execute();
  return rows.map(({ travelTimes, ...row }) => {
    const { results } = toDestinationResults(travelTimes as TravelTimeEntry[], DESTINATIONS);
    const times = TABLE_COLUMNS.map((column) => [column.key, timeCell(results, column)]);
    return { ...row, times: Object.fromEntries(times) };
  });
}
