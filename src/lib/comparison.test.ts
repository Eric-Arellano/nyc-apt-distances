import { describe, expect, test } from 'vitest';
import {
  type ApartmentRow,
  DEFAULT_SORT,
  nextSort,
  parseSort,
  sortRows,
  sortSearch,
  streetPart,
  type TimeCell,
} from './comparison';
import type { ApartmentId } from './server/db/schema/public/Apartment.ts';

const KEYS = ['apartment', 'status', 'rent', 'hebrew-institute-walk'];

describe('parseSort', () => {
  test.each([
    ['', DEFAULT_SORT],
    ['?sort=rent', { key: 'rent', desc: false }],
    ['?sort=hebrew-institute-walk&desc', { key: 'hebrew-institute-walk', desc: true }],
    ['?sort=removed-column&desc', DEFAULT_SORT],
    ['?desc', DEFAULT_SORT],
  ])('reads %j', (search, expected) => {
    expect(parseSort(new URLSearchParams(search), KEYS)).toEqual(expected);
  });
});

describe('sortSearch', () => {
  test('leaves the default out of the URL', () => {
    expect(sortSearch(DEFAULT_SORT)).toBe('');
  });

  test.each([
    { key: 'status', desc: true },
    { key: 'rent', desc: false },
    { key: 'hebrew-institute-walk', desc: true },
  ])('round-trips through parseSort: %j', (sort) => {
    expect(parseSort(new URLSearchParams(sortSearch(sort)), KEYS)).toEqual(sort);
  });
});

describe('nextSort', () => {
  test('sorts a new column ascending', () => {
    expect(nextSort({ key: 'rent', desc: true }, 'status')).toEqual({ key: 'status', desc: false });
  });

  test('reverses the current column', () => {
    expect(nextSort({ key: 'rent', desc: false }, 'rent')).toEqual({ key: 'rent', desc: true });
    expect(nextSort({ key: 'rent', desc: true }, 'rent')).toEqual({ key: 'rent', desc: false });
  });
});

describe('streetPart', () => {
  test.each([
    ['12 Juniper Row, White Plains, NY 10601', '12 Juniper Row'],
    ['12 Juniper Row', '12 Juniper Row'],
  ])('takes %j up to the first comma', (address, expected) => {
    expect(streetPart(address)).toBe(expected);
  });
});

describe('sortRows', () => {
  function row(
    id: number,
    {
      address = `${id} Main St`,
      status = 'interested',
      rent = null,
      minutes,
    }: Partial<ApartmentRow> & { minutes?: TimeCell } = {},
  ): ApartmentRow {
    return {
      id: id as ApartmentId,
      address,
      unit: null,
      status,
      rent,
      nextStep: null,
      times: minutes ? { walk: minutes } : {},
    };
  }

  function ids(rows: readonly ApartmentRow[]) {
    return rows.map(({ id }) => id);
  }

  describe('by a time column', () => {
    const rows = [
      row(1, { minutes: { kind: 'trip', minutes: 20 } }),
      row(2, { minutes: { kind: 'missing' } }),
      row(3, { minutes: { kind: 'trip', minutes: 5 } }),
      row(4, { minutes: { kind: 'trip', minutes: null } }),
      row(5, { minutes: { kind: 'trip', minutes: 12 } }),
    ];

    test('puts the shortest first, and missing or unroutable trips last', () => {
      expect(ids(sortRows(rows, { key: 'walk', desc: false }).inPlay)).toEqual([3, 5, 1, 4, 2]);
    });

    test('keeps blanks last when reversed', () => {
      expect(ids(sortRows(rows, { key: 'walk', desc: true }).inPlay)).toEqual([1, 5, 3, 4, 2]);
    });
  });

  test('sorts status in process order', () => {
    const rows = [
      row(1, { status: 'applied' }),
      row(2, { status: 'interested' }),
      row(3, { status: 'visited' }),
    ];
    expect(ids(sortRows(rows, DEFAULT_SORT).inPlay)).toEqual([2, 3, 1]);
  });

  test('sorts rent cheapest first, with no rent last', () => {
    const rows = [row(1, { rent: 3000 }), row(2), row(3, { rent: 2500 })];
    expect(ids(sortRows(rows, { key: 'rent', desc: false }).inPlay)).toEqual([3, 1, 2]);
  });

  test('sorts apartments by street, ignoring the house number', () => {
    const rows = [
      row(1, { address: '9 Birch Ln, White Plains' }),
      row(2, { address: '100 Ash St, White Plains' }),
      row(3, { address: '2 Cedar Ave, White Plains' }),
    ];
    expect(ids(sortRows(rows, { key: 'apartment', desc: false }).inPlay)).toEqual([2, 1, 3]);
  });

  test('breaks ties newest first, whichever way', () => {
    const rows = [row(1, { rent: 2500 }), row(3, { rent: 2500 }), row(2, { rent: 2500 })];
    expect(ids(sortRows(rows, { key: 'rent', desc: false }).inPlay)).toEqual([3, 2, 1]);
    expect(ids(sortRows(rows, { key: 'rent', desc: true }).inPlay)).toEqual([3, 2, 1]);
  });

  test('sets "Not for us" apart, sorted the same way', () => {
    const rows = [
      row(1, { status: 'not_for_us', rent: 3000 }),
      row(2, { rent: 2800 }),
      row(3, { status: 'not_for_us', rent: 2000 }),
    ];
    expect(sortRows(rows, { key: 'rent', desc: false })).toEqual({
      inPlay: [rows[1]],
      notForUs: [rows[2], rows[0]],
    });
  });
});
