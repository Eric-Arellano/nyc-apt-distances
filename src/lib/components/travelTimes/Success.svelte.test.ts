// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { DestinationResult, Goal, Route } from '#lib/types.ts';
import Success from './Success.svelte';

const HARLEM_LINE: Route = {
  mode: 'transit',
  timeMinutes: 18,
  rides: [{ line: 'Harlem', vehicle: 'train' }],
};
const SHOULD_GOAL: Goal = { strictness: 'should', idealMinutes: 40, maxMinutes: 55 };

function transitCard(title: string, goal: Goal, routes: Route[]): DestinationResult {
  return { id: title, title, goal, closest: null, routes };
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

// The institute and park are slower than ideal but within the max; the grocery is beyond the max.
const DESTINATIONS: DestinationResult[] = [
  {
    id: 'metro-north',
    title: 'Metro-North station 🚆',
    goal: { strictness: 'must', idealMinutes: 10, maxMinutes: 20 },
    closest: { name: 'White Plains' },
    routes: [
      { mode: 'walk', timeMinutes: 9, distanceMiles: 0.4 },
      { mode: 'bike', timeMinutes: 4, distanceMiles: 1.5 },
    ],
  },
  walkCard('Hebrew Institute of White Plains', 'must', [15, 25], null, [18, 1.1]),
  walkCard('Park or trail 🌳', 'should', [10, 20], { name: 'Turnure Park' }, [13, 0.7]),
  walkCard('Grocery store 🛒', 'should', [10, 20], { name: 'ShopRite' }, [24, 1.2]),
];

const SHOULD_40_55 = 'Should be within 55 minutes; ideally within 40 minutes';

// Every card the page shows, in order. PRs that restructure destinations must leave this alone.
const EXPECTED_CARDS = [
  {
    title: 'Metro-North station 🚆',
    goal: 'Must be within 20 minutes; ideally within 10 minutes',
    routes: ['🚶 9 minutes to White Plains (0.4 miles)', '🚴 4 minutes (1.5 miles)'],
    status: 'met',
  },
  {
    title: 'Hebrew Institute of White Plains',
    goal: 'Must be within a 25-minute walk; ideally within 15 minutes',
    routes: ['🚶 18 minutes (1.1 miles)'],
    status: 'partial',
  },
  {
    title: 'Park or trail 🌳',
    goal: 'Should be within a 20-minute walk; ideally within 10 minutes',
    routes: ['🚶 13 minutes to Turnure Park (0.7 miles)'],
    status: 'partial',
  },
  {
    title: 'Grocery store 🛒',
    goal: 'Should be within a 20-minute walk; ideally within 10 minutes',
    routes: ['🚶 24 minutes to ShopRite (1.2 miles)'],
    status: 'unmet',
  },
];

function renderedCards(destinations: DestinationResult[]) {
  const { container } = render(Success, { destinations });
  return [...container.querySelectorAll<HTMLElement>('[data-status]')].map((card) => ({
    title: card.querySelector('h3')?.textContent,
    goal: card.querySelector('p')?.textContent,
    routes: [...card.querySelectorAll('.space-y-2 > div')].map((route) =>
      route.textContent?.trim(),
    ),
    status: card.dataset.status,
  }));
}

describe('Success', () => {
  it('renders every destination card', () => {
    expect(renderedCards(DESTINATIONS)).toEqual(EXPECTED_CARDS);
  });

  it('renders transit routes', () => {
    const card = transitCard('Grand Central', SHOULD_GOAL, [
      HARLEM_LINE,
      { mode: 'transit', timeMinutes: 60, rides: [] },
    ]);

    expect(renderedCards([card])).toEqual([
      {
        title: 'Grand Central',
        goal: SHOULD_40_55,
        routes: ['🚆 18 minutes on the Harlem', '🚆 60 minutes by walking'],
        status: 'met',
      },
    ]);
  });

  it('marks a destination with no route as unmet', () => {
    const card = transitCard('Pound Ridge', SHOULD_GOAL, [
      { mode: 'unavailable', tripMode: 'transit' },
    ]);

    expect(renderedCards([card])).toEqual([
      {
        title: 'Pound Ridge',
        goal: SHOULD_40_55,
        routes: ['🚆 No transit route'],
        status: 'unmet',
      },
    ]);
  });
});
