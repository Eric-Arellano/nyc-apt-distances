// @vitest-environment jsdom
import { render, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { DestinationResult, Goal } from '#lib/types.ts';
import DestinationList from './DestinationList.svelte';

const BET_AM_SHALOM_GOAL: Goal = { strictness: 'should', idealMinutes: 30, maxMinutes: 45 };

/**
 * The station's bike meets its goal while its walk is only partial. Bet Am Shalom's walk misses,
 * its Friday bus meets, it has no Saturday route, and its drive is past its only limit. CBST's
 * trip has no goal, so it is never judged.
 */
const DESTINATIONS: DestinationResult[] = [
  {
    id: 'metro-north',
    title: 'Metro-North station',
    closest: { name: 'White Plains' },
    trips: [
      {
        goal: { strictness: 'should', idealMinutes: 15, maxMinutes: 25 },
        route: { mode: 'walk', timeMinutes: 19, distanceMiles: 0.9 },
      },
      {
        goal: { strictness: 'must', idealMinutes: 10, maxMinutes: 15 },
        route: { mode: 'bike', timeMinutes: 6, distanceMiles: 1.5 },
      },
    ],
  },
  {
    id: 'bet-am-shalom',
    title: 'Bet Am Shalom',
    closest: null,
    trips: [
      { goal: BET_AM_SHALOM_GOAL, route: { mode: 'walk', timeMinutes: 52, distanceMiles: 2.6 } },
      {
        label: 'Friday 6:15 pm',
        goal: BET_AM_SHALOM_GOAL,
        route: { mode: 'transit', timeMinutes: 24, rides: [{ line: '60', vehicle: 'bus' }] },
      },
      {
        label: 'Saturday 9:30 am',
        goal: BET_AM_SHALOM_GOAL,
        route: { mode: 'unavailable', tripMode: 'transit' },
      },
      {
        goal: { strictness: 'should', maxMinutes: 15 },
        route: { mode: 'drive', timeMinutes: 16, distanceMiles: 2.6 },
      },
    ],
  },
  {
    id: 'cbst',
    title: 'Congregation Beit Simchat Torah',
    closest: null,
    trips: [{ route: { mode: 'transit', timeMinutes: 80, rides: [] } }],
  },
];

const EXPECTED_CARDS = [
  {
    title: 'Metro-North station',
    closest: 'Closest: White Plains',
    trips: [
      {
        text: '🚶 19 minutes (0.9 miles)',
        goal: 'Should be within 25 minutes; ideally within 15 minutes',
        status: 'partial',
      },
      {
        text: '🚴 6 minutes (1.5 miles)',
        goal: 'Must be within 15 minutes; ideally within 10 minutes',
        status: 'met',
      },
    ],
  },
  {
    title: 'Bet Am Shalom',
    closest: undefined,
    trips: [
      {
        text: '🚶 52 minutes (2.6 miles)',
        goal: 'Should be within 45 minutes; ideally within 30 minutes',
        status: 'unmet',
      },
      {
        text: '🚌 Friday 6:15 pm: 24 minutes on the 60 bus',
        goal: 'Should be within 45 minutes; ideally within 30 minutes',
        status: 'met',
      },
      {
        text: '🚆 Saturday 9:30 am: No transit route',
        goal: 'Should be within 45 minutes; ideally within 30 minutes',
        status: 'unmet',
      },
      { text: '🚗 16 minutes (2.6 miles)', goal: 'Should be within 15 minutes', status: 'unmet' },
    ],
  },
  {
    title: 'Congregation Beit Simchat Torah',
    closest: undefined,
    trips: [{ text: '🚆 80 minutes by walking', goal: undefined, status: undefined }],
  },
];

function renderedCards(destinations: DestinationResult[]) {
  const { container } = render(DestinationList, { destinations });
  return [...container.querySelectorAll<HTMLElement>(':scope > ul > li')].map((card) => ({
    title: card.querySelector('h3')?.textContent,
    closest: card.querySelector(':scope > p')?.textContent,
    trips: within(card)
      .getAllByRole('listitem')
      .map((trip) => {
        const goal = trip.querySelector('p');
        return {
          text: trip.firstChild?.textContent?.trim(),
          goal: goal?.textContent,
          status: trip.dataset.status,
        };
      }),
  }));
}

describe('DestinationList', () => {
  test('judges each trip against its own goal', () => {
    expect(renderedCards(DESTINATIONS)).toEqual(EXPECTED_CARDS);
  });
});
