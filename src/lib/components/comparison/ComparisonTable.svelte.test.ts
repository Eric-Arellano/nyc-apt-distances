// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import type { ApartmentRow, ColumnGroup, Sort } from '#lib/comparisonTable.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import ComparisonTable from './ComparisonTable.svelte';

const GROUPS: ColumnGroup[] = [
  {
    title: 'White Plains Metro-North station',
    shortTitle: 'Station',
    columns: [
      {
        key: 'station-walk',
        destinationId: 'station',
        tripIndex: 0,
        icon: '🚶',
        title: 'Station: walk',
      },
      {
        key: 'station-bike',
        destinationId: 'station',
        tripIndex: 1,
        icon: '🚴',
        title: 'Station: bike',
      },
    ],
  },
  {
    title: 'Hebrew Institute of White Plains',
    shortTitle: 'HI',
    columns: [{ key: 'hi-walk', destinationId: 'hi', tripIndex: 0, icon: '🚶', title: 'HI: walk' }],
  },
];

const ROWS: ApartmentRow[] = [
  {
    id: 1 as ApartmentId,
    address: '12 Juniper Row, White Plains, NY 10601',
    unit: '4B',
    status: 'visited',
    rent: 2850,
    nextStep: 'Send pay stubs',
    times: {
      'station-walk': { kind: 'trip', minutes: 9, status: 'met' },
      'station-bike': { kind: 'trip', minutes: null, status: 'unmet' },
      'hi-walk': { kind: 'missing' },
    },
  },
  {
    id: 2 as ApartmentId,
    address: '7 Saltbox Ln, White Plains, NY 10606',
    unit: null,
    status: 'not_for_us',
    rent: null,
    nextStep: null,
    times: {
      'station-walk': { kind: 'trip', minutes: 30, status: 'unmet' },
      'station-bike': { kind: 'trip', minutes: 8 },
      'hi-walk': { kind: 'trip', minutes: 14, status: 'met' },
    },
  },
  {
    id: 3 as ApartmentId,
    address: '3 Millpond Ct, White Plains, NY 10603',
    unit: null,
    status: 'interested',
    rent: 2700,
    nextStep: null,
    times: {
      'station-walk': { kind: 'trip', minutes: 20, status: 'partial' },
      'station-bike': { kind: 'trip', minutes: 6, status: 'met' },
      'hi-walk': { kind: 'trip', minutes: 30, status: 'unmet' },
    },
  },
];

// Joined by no-break spaces, so the unit never wraps alone.
const JUNIPER = '12 Juniper Row\u00a0·\u00a04B';

function renderTable(sort: Sort = { key: 'status', desc: false }) {
  const onsort = vi.fn();
  render(ComparisonTable, { groups: GROUPS, rows: ROWS, sort, onsort });
  return onsort;
}

function bodyRows() {
  const [, body] = screen.getAllByRole('rowgroup');
  return within(body as HTMLElement)
    .getAllByRole('row')
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent?.trim()),
    );
}

describe('ComparisonTable', () => {
  test('lists apartments in play, then "Not for us" apart', () => {
    renderTable();

    expect(bodyRows()).toEqual([
      ['3 Millpond Ct', 'Interested', '$2,700', '20', '6', '30'],
      [`${JUNIPER} Send pay stubs`, 'Visited', '$2,850', '9', 'None', '—'],
      ['Not for us · 1'],
      ['7 Saltbox Ln', 'Not for us', '', '30', '8', '14'],
    ]);
  });

  test('links each apartment to its page, titled with its full address', () => {
    renderTable();

    const link = screen.getByRole('link', { name: JUNIPER });
    expect(link.getAttribute('href')).toBe('/apartments/1');
    expect(link.getAttribute('title')).toBe('12 Juniper Row, White Plains, NY 10601, Unit 4B');
  });

  test('tints times by goal, except a trip with no goal or a rejected apartment', () => {
    renderTable();

    const tints = screen
      .getAllByRole('cell')
      .filter((cell) => /^(\d+|None|—)$/.test(cell.textContent?.trim() ?? ''))
      .map((cell) => [
        cell.textContent?.trim(),
        cell.className.match(/bg-(green|yellow|red)/)?.[1],
      ]);
    expect(tints).toEqual([
      ['20', 'yellow'],
      ['6', 'green'],
      ['30', 'red'],
      ['9', 'green'],
      ['None', 'red'],
      ['—', undefined],
      ['30', undefined],
      ['8', undefined],
      ['14', undefined],
    ]);
  });

  describe('sorting', () => {
    test('marks the sorted column', () => {
      renderTable({ key: 'hi-walk', desc: true });

      const sorted = screen
        .getAllByRole('columnheader')
        .filter((th) => th.hasAttribute('aria-sort'));
      expect(sorted.map((th) => [th.title, th.getAttribute('aria-sort')])).toEqual([
        ['HI: walk', 'descending'],
      ]);
      expect(bodyRows().map(([apartment]) => apartment)).toEqual([
        '3 Millpond Ct',
        `${JUNIPER} Send pay stubs`,
        'Not for us · 1',
        '7 Saltbox Ln',
      ]);
    });

    test.each([
      ['Apartment', 'apartment'],
      ['Rent /mo', 'rent'],
      ['Station: bike', 'station-bike'],
      ['HI: walk', 'hi-walk'],
    ])('asks to sort by %s', async (name, key) => {
      const onsort = renderTable();

      await fireEvent.click(screen.getByRole('button', { name }));

      expect(onsort).toHaveBeenCalledExactlyOnceWith(key);
    });
  });
});
