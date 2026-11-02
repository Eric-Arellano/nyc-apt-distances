// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { DestinationResult, Goal, Route } from '#lib/types.ts';
import Success from './Success.svelte';

const TWO_TRAIN: Route = { mode: 'transit', timeMinutes: 18, summary: '2' };
const SHOULD_GOAL: Goal = { strictness: 'should', idealMinutes: 40, maxMinutes: 55 };

function transitCard(title: string, goal: Goal, route = TWO_TRAIN): DestinationResult {
  return { id: title, title, goal, closest: null, routes: [route] };
}

function walkCard(
  title: string,
  strictness: Goal['strictness'],
  [idealMinutes, maxMinutes]: [number, number],
  closest: DestinationResult['closest'],
  [timeMinutes, distanceMiles]: [number, number],
): DestinationResult {
  return {
    id: title,
    title,
    goal: { strictness, idealMinutes, maxMinutes },
    closest,
    routes: [{ mode: 'walk', timeMinutes, distanceMiles }],
  };
}

// Park is slower than ideal but within the max; Astoria is beyond the max.
const DESTINATIONS: DestinationResult[] = [
  {
    id: 'work',
    title: 'Work 👨🏼‍💻',
    goal: { strictness: 'must', idealMinutes: 15, maxMinutes: 25 },
    closest: null,
    routes: [
      { mode: 'transit', timeMinutes: 7, summary: 'N' },
      { mode: 'bike', timeMinutes: 4, distanceMiles: 1.5 },
      { mode: 'walk', timeMinutes: 18, distanceMiles: 1.5 },
    ],
  },
  walkCard(
    'Subway stop 🚇',
    'must',
    [7, 12],
    { name: '14th St', additionalInfo: 'with E, Q, R' },
    [6, 0.3],
  ),
  walkCard('Park 🌳', 'must', [10, 15], { name: 'Union Square' }, [13, 0.7]),
  walkCard(
    'Farmers market 🍉 (low priority)',
    'should',
    [15, 20],
    { name: 'Union Square' },
    [12, 0.8],
  ),
  transitCard('Downtown Brooklyn', { strictness: 'should', idealMinutes: 30, maxMinutes: 45 }),
  transitCard('Park Slope', SHOULD_GOAL),
  transitCard('Williamsburg', { strictness: 'should', idealMinutes: 35, maxMinutes: 50 }),
  transitCard('Astoria (low priority)', SHOULD_GOAL, {
    mode: 'transit',
    timeMinutes: 60,
    summary: null,
  }),
  transitCard('Jackson Heights (low priority)', SHOULD_GOAL),
  transitCard('Mott Haven (low priority)', SHOULD_GOAL),
  transitCard('Jersey City (low priority)', {
    strictness: 'should',
    idealMinutes: 45,
    maxMinutes: 60,
  }),
];

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
    const { container } = render(Success, { destinations: DESTINATIONS });

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
