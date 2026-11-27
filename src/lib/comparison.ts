import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import type ApartmentStatus from '#lib/server/db/schema/public/ApartmentStatus.ts';
import { STATUSES } from '#lib/status.ts';
import type { GoalStatus } from '#lib/types.ts';

export interface TimeColumn {
  key: string; // Names the column in `?sort=`, so a shared link keeps working.
  destinationId: string;
  tripIndex: number;
  icon: string;
  label?: string;
  title: string;
}

export interface ColumnGroup {
  title: string;
  shortTitle: string;
  columns: TimeColumn[];
}

export type TimeCell =
  | { kind: 'missing' } // The snapshot predates the destination or its trips.
  | { kind: 'trip'; minutes: number | null; status?: GoalStatus }; // null: Google found no route.

export interface ApartmentRow {
  id: ApartmentId;
  address: string;
  unit: string | null;
  status: ApartmentStatus;
  rent: number | null;
  nextStep: string | null;
  times: Record<string, TimeCell>; // By column key.
}

export interface Sort {
  key: string;
  desc: boolean;
}

export const DEFAULT_SORT: Sort = { key: 'status', desc: false };

export const FIXED_SORT_KEYS = ['apartment', 'status', 'rent'] as const;

export function parseSort(
  params: Pick<URLSearchParams, 'get' | 'has'>,
  keys: readonly string[],
): Sort {
  const key = params.get('sort');
  if (key === null || !keys.includes(key)) return DEFAULT_SORT;
  return { key, desc: params.has('desc') };
}

// `''` for the default, so the plain home page link is the default sort.
export function sortSearch({ key, desc }: Sort): string {
  if (key === DEFAULT_SORT.key && desc === DEFAULT_SORT.desc) return '';
  return `?sort=${encodeURIComponent(key)}${desc ? '&desc' : ''}`;
}

export function nextSort(current: Sort, key: string): Sort {
  return { key, desc: current.key === key && !current.desc };
}

/** `12 Juniper Row` from `12 Juniper Row, White Plains, NY 10601`. */
export function streetPart(address: string): string {
  return address.split(',')[0]?.trim() ?? address;
}

const COLLATOR = new Intl.Collator('en-US', { numeric: true, sensitivity: 'base' });

// Every value sorts ascending the obvious way: A to Z, earliest in the process, cheapest, shortest.
function sortValue(row: ApartmentRow, key: string): string | number | null {
  switch (key) {
    case 'apartment':
      // By street, since the house number says nothing about where it is.
      return streetPart(row.address).replace(/^\d\S*\s+/, '');
    case 'status':
      return STATUSES.indexOf(row.status);
    case 'rent':
      return row.rent;
    default: {
      const cell = row.times[key];
      return cell?.kind === 'trip' ? cell.minutes : null;
    }
  }
}

function compareValues(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : COLLATOR.compare(`${a}`, `${b}`);
}

/**
 * Blanks sink to the bottom whichever way, and ties fall back to newest first. "Not for us" is
 * apart, so the comparison is among the apartments still in play.
 */
export function sortRows(
  rows: readonly ApartmentRow[],
  { key, desc }: Sort,
): { inPlay: ApartmentRow[]; notForUs: ApartmentRow[] } {
  const sorted = rows.toSorted((a, b) => {
    const x = sortValue(a, key);
    const y = sortValue(b, key);
    if (x === null && y !== null) return 1;
    if (y === null && x !== null) return -1;
    const order = x === null || y === null ? 0 : compareValues(x, y);
    if (order !== 0) return desc ? -order : order;
    return b.id - a.id;
  });
  return {
    inPlay: sorted.filter(({ status }) => status !== 'not_for_us'),
    notForUs: sorted.filter(({ status }) => status === 'not_for_us'),
  };
}
