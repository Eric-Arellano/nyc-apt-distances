// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import type {
  ApartmentChoice,
  ComparedApartment,
  Pair,
  PairedDestination,
} from '#lib/sideBySide.ts';
import SideBySide from './SideBySide.svelte';

const JUNIPER: ComparedApartment = {
  id: 1 as ApartmentId,
  address: '12 Juniper Row, White Plains, NY 10601',
  unit: '4B',
  status: 'visited',
  rent: 2850,
  nextStep: 'Send pay stubs',
  listingUrl: 'https://www.streeteasy.com/rental/1',
};

const SALTBOX: ComparedApartment = {
  id: 2 as ApartmentId,
  address: '7 Saltbox Ln, White Plains, NY 10606',
  unit: null,
  status: 'interested',
  rent: 2700,
  nextStep: null,
  listingUrl: null,
};

const CHOICES: ApartmentChoice[] = [
  {
    id: 3 as ApartmentId,
    address: '3 Millpond Ct, White Plains',
    unit: null,
    status: 'not_for_us',
  },
  ...[SALTBOX, JUNIPER].map(({ id, address, unit, status }) => ({ id, address, unit, status })),
];

const GOAL = { strictness: 'should', idealMinutes: 10, maxMinutes: 20 } as const;

const DESTINATIONS: PairedDestination[] = [
  {
    id: 'park',
    title: 'Park or trail',
    closest: ['Turnure Park', 'Gillie Park'],
    trips: [
      {
        mode: 'walk',
        goal: GOAL,
        sides: [
          {
            kind: 'trip',
            route: { mode: 'walk', timeMinutes: 6, distanceMiles: 0.3 },
            status: 'met',
          },
          {
            kind: 'trip',
            route: { mode: 'walk', timeMinutes: 12, distanceMiles: 0.6 },
            status: 'partial',
          },
        ],
      },
    ],
  },
  {
    id: 'bet-am-shalom',
    title: 'Bet Am Shalom',
    closest: [null, null],
    trips: [
      {
        mode: 'transit',
        label: 'Friday 6:15 pm',
        goal: GOAL,
        sides: [
          { kind: 'missing' },
          {
            kind: 'trip',
            route: { mode: 'transit', timeMinutes: 16, rides: [{ line: '5', vehicle: 'bus' }] },
            status: 'partial',
          },
        ],
      },
      {
        mode: 'drive',
        sides: [
          { kind: 'trip', route: { mode: 'unavailable', tripMode: 'drive' } },
          { kind: 'trip', route: { mode: 'drive', timeMinutes: 7, distanceMiles: 2 } },
        ],
      },
    ],
  },
];

function renderView(apartments: Pair<ComparedApartment | null> = [JUNIPER, SALTBOX]) {
  const onchoose = vi.fn();
  const onswap = vi.fn();
  render(SideBySide, {
    choices: CHOICES,
    apartments,
    destinations: DESTINATIONS,
    onchoose,
    onswap,
  });
  return { onchoose, onswap };
}

// Each value's box, in reading order: left then right, row by row.
function cells() {
  return [...document.querySelectorAll('.border-2')].map((cell) => ({
    text: cell.textContent?.replace(/\s+/g, ' ').trim(),
    tint: cell.className.match(/bg-(green|yellow|red)/)?.[1],
    better: cell.className.includes('border-foreground'),
  }));
}

describe('SideBySide', () => {
  test('shows every row for both apartments, marking the better side', () => {
    renderView();

    expect(cells()).toEqual([
      { text: 'Visited', tint: undefined, better: false },
      { text: 'Interested', tint: undefined, better: false },
      { text: '$2,850', tint: undefined, better: false },
      { text: '$2,700 $150 less', tint: undefined, better: true },
      { text: 'Send pay stubs', tint: undefined, better: false },
      { text: '—', tint: undefined, better: false },
      { text: 'streeteasy.com', tint: undefined, better: false },
      { text: '—', tint: undefined, better: false },
      { text: '6 min 6 min faster', tint: 'green', better: true },
      { text: '12 min', tint: 'yellow', better: false },
      { text: '— Not calculated yet', tint: undefined, better: false },
      { text: '16 min 5 bus', tint: 'yellow', better: false },
      { text: 'No route', tint: undefined, better: false },
      { text: '7 min', tint: undefined, better: false },
    ]);
  });

  test('names the place picked for each side, and each trip’s goal', () => {
    renderView();

    expect(screen.getByText('Turnure Park')).toBeTruthy();
    expect(screen.getByText('Gillie Park')).toBeTruthy();
    expect(
      screen.getByText('Friday 6:15 pm · Should be within 20 minutes; ideally within 10 minutes'),
    ).toBeTruthy();
  });

  test('links each side to its apartment’s page', () => {
    renderView();

    const links = screen.getAllByRole('link', { name: 'Open its page' });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/apartments/1',
      '/apartments/2',
    ]);
  });

  describe('choosing', () => {
    test('reports the apartment picked on a side', async () => {
      const { onchoose } = renderView();

      await fireEvent.change(screen.getByRole('combobox', { name: 'Right apartment' }), {
        target: { value: '3' },
      });
      expect(onchoose).toHaveBeenCalledWith(1, 3);
    });

    test('offers "Not for us" apart, and not the apartment on the other side', () => {
      renderView();

      const select = screen.getByRole('combobox', { name: 'Left apartment' });
      const groups = [...select.querySelectorAll('optgroup')].map((group) => ({
        label: group.label,
        options: [...group.querySelectorAll('option')].map((option) => [
          option.textContent?.trim(),
          option.disabled,
        ]),
      }));
      expect(groups).toEqual([
        {
          label: 'In play',
          options: [
            ['7 Saltbox Ln', true],
            ['12 Juniper Row · 4B', false],
          ],
        },
        { label: 'Not for us', options: [['3 Millpond Ct', false]] },
      ]);
    });

    test('swaps the sides', async () => {
      const { onswap } = renderView();

      await fireEvent.click(screen.getByRole('button', { name: 'Swap sides' }));
      expect(onswap).toHaveBeenCalled();
    });
  });

  describe('with one side chosen', () => {
    test('shows only that side, and cannot swap', () => {
      renderView([JUNIPER, null]);

      expect(cells().map(({ text }) => text)).toEqual([
        'Visited',
        '$2,850',
        'Send pay stubs',
        'streeteasy.com',
        '6 min',
        '— Not calculated yet',
        'No route',
      ]);
      expect(screen.getByRole('button', { name: 'Swap sides' }).hasAttribute('disabled')).toBe(
        true,
      );
    });
  });

  describe('with neither chosen', () => {
    test('asks for two', () => {
      renderView([null, null]);

      expect(screen.getByText('Choose two apartments above to see how they differ.')).toBeTruthy();
      expect(cells()).toEqual([]);
    });
  });
});
