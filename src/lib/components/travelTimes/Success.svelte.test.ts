// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { DestinationResult, Goal, Route } from '#lib/types.ts';
import Success from './Success.svelte';

const BET_AM_SHALOM_GOAL: Goal = { strictness: 'should', idealMinutes: 15, maxMinutes: 25 };
const BET_AM_SHALOM_WALK: Route = { mode: 'walk', timeMinutes: 32, distanceMiles: 1.6 };

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

// The institute and park are slower than ideal but within the max; the grocery's walk is beyond
// the max, but its drive is not. Bet Am Shalom has a bus on Friday, only walking and no drive on
// Saturday, and no transit route to CBST. Florham Park is beyond the max.
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
  {
    id: 'grocery',
    title: 'Grocery store 🛒',
    goal: { strictness: 'should', idealMinutes: 10, maxMinutes: 20 },
    closest: { name: 'ShopRite' },
    routes: [
      { mode: 'walk', timeMinutes: 24, distanceMiles: 1.2 },
      { mode: 'drive', timeMinutes: 8, distanceMiles: 1.4 },
    ],
  },
  {
    id: 'bet-am-shalom-friday',
    title: 'Bet Am Shalom, Friday 6:15 pm',
    goal: BET_AM_SHALOM_GOAL,
    closest: null,
    routes: [
      BET_AM_SHALOM_WALK,
      { mode: 'transit', timeMinutes: 14, rides: [{ line: '60', vehicle: 'bus' }] },
      { mode: 'drive', timeMinutes: 11, distanceMiles: 2.3 },
    ],
  },
  {
    id: 'bet-am-shalom-saturday',
    title: 'Bet Am Shalom, Saturday 9:30 am',
    goal: BET_AM_SHALOM_GOAL,
    closest: null,
    routes: [
      BET_AM_SHALOM_WALK,
      { mode: 'transit', timeMinutes: 30, rides: [] },
      { mode: 'unavailable', tripMode: 'drive' },
    ],
  },
  {
    id: 'cbst',
    title: 'Congregation Beit Simchat Torah, Saturday 10 am',
    goal: { strictness: 'should', idealMinutes: 75, maxMinutes: 95 },
    closest: null,
    routes: [{ mode: 'unavailable', tripMode: 'transit' }],
  },
  {
    id: 'florham-park',
    title: 'Florham Park, NJ',
    goal: { strictness: 'should', idealMinutes: 45, maxMinutes: 60 },
    closest: null,
    routes: [{ mode: 'drive', timeMinutes: 68, distanceMiles: 58.2 }],
  },
];

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
    goal: 'Should be within 20 minutes; ideally within 10 minutes',
    routes: ['🚶 24 minutes to ShopRite (1.2 miles)', '🚗 8 minutes (1.4 miles)'],
    status: 'met',
  },
  {
    title: 'Bet Am Shalom, Friday 6:15 pm',
    goal: 'Should be within 25 minutes; ideally within 15 minutes',
    routes: [
      '🚶 32 minutes (1.6 miles)',
      '🚌 14 minutes on the 60 bus',
      '🚗 11 minutes (2.3 miles)',
    ],
    status: 'met',
  },
  {
    title: 'Bet Am Shalom, Saturday 9:30 am',
    goal: 'Should be within 25 minutes; ideally within 15 minutes',
    routes: ['🚶 32 minutes (1.6 miles)', '🚆 30 minutes by walking', '🚗 No driving route'],
    status: 'unmet',
  },
  {
    title: 'Congregation Beit Simchat Torah, Saturday 10 am',
    goal: 'Should be within 95 minutes; ideally within 75 minutes',
    routes: ['🚆 No transit route'],
    status: 'unmet',
  },
  {
    title: 'Florham Park, NJ',
    goal: 'Should be within 60 minutes; ideally within 45 minutes',
    routes: ['🚗 68 minutes (58.2 miles)'],
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
});
