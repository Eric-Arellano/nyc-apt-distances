// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { MOCK_DATA } from '#lib/mockData.ts';
import type { TravelTimes } from '#lib/types.ts';
import Success from './Success.svelte';

// Park is slower than ideal but within the max; Astoria is beyond the max.
const TRAVEL_TIMES: TravelTimes = {
  ...MOCK_DATA,
  park: { ...MOCK_DATA.park, walk: { timeMinutes: 13, distanceMiles: 0.7 } },
  astoria: { transit: { timeMinutes: 60, type: 'walking' } },
};

const SHOULD_40_55 = 'Should be within 55 minutes; ideally within 40 minutes';

// Every card the page shows, in order. PRs that restructure destinations must leave this alone.
const EXPECTED_CARDS = [
  {
    title: 'Work 👨🏼‍💻',
    goal: 'Must be within 25 minutes; ideally within 15 minutes',
    routes: ['🚇 7 minutes on the N', '🚴 4 minutes (1.5 miles)', '🚶 18 minutes (1.5 miles)'],
    status: 'met',
  },
  {
    title: 'Subway stop 🚇',
    goal: 'Must be within a 12-minute walk; ideally within 7 minutes',
    routes: ['🚶 6 minutes to 14th St with E, Q, R (0.3 miles)'],
    status: 'met',
  },
  {
    title: 'Park 🌳',
    goal: 'Must be within a 15-minute walk; ideally within 10 minutes',
    routes: ['🚶 13 minutes to Union Square (0.7 miles)'],
    status: 'partial',
  },
  {
    title: 'Farmers market 🍉 (low priority)',
    goal: 'Should be within a 20-minute walk; ideally within 15 minutes',
    routes: ['🚶 12 minutes to Union Square (0.8 miles)'],
    status: 'met',
  },
  {
    title: 'Downtown Brooklyn',
    goal: 'Should be within 45 minutes; ideally within 30 minutes',
    routes: ['🚇 18 minutes on the 2'],
    status: 'met',
  },
  {
    title: 'Park Slope',
    goal: SHOULD_40_55,
    routes: ['🚇 18 minutes on the 2'],
    status: 'met',
  },
  {
    title: 'Williamsburg',
    goal: 'Should be within 50 minutes; ideally within 35 minutes',
    routes: ['🚇 18 minutes on the 2'],
    status: 'met',
  },
  {
    title: 'Astoria (low priority)',
    goal: SHOULD_40_55,
    routes: ['🚇 60 minutes by walking'],
    status: 'unmet',
  },
  {
    title: 'Jackson Heights (low priority)',
    goal: SHOULD_40_55,
    routes: ['🚇 18 minutes on the 2'],
    status: 'met',
  },
  {
    title: 'Mott Haven (low priority)',
    goal: SHOULD_40_55,
    routes: ['🚇 18 minutes on the 2'],
    status: 'met',
  },
  {
    title: 'Jersey City (low priority)',
    goal: 'Should be within 60 minutes; ideally within 45 minutes',
    routes: ['🚇 18 minutes on the 2'],
    status: 'met',
  },
];

describe('Success', () => {
  it('renders every destination card', () => {
    const { container } = render(Success, TRAVEL_TIMES);

    const cards = [...container.querySelectorAll<HTMLElement>('[data-status]')].map((card) => ({
      title: card.querySelector('h3')?.textContent,
      goal: card.querySelector('p')?.textContent,
      routes: [...card.querySelectorAll('.space-y-2 > div')].map((route) =>
        route.textContent?.trim(),
      ),
      status: card.dataset.status,
    }));

    expect(cards).toEqual(EXPECTED_CARDS);
  });
});
