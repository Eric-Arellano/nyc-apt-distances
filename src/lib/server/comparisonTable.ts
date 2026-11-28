import type { ColumnGroup, TimeCell, TimeColumn } from '#lib/comparisonTable.ts';
import { type DestinationResult, goalStatus } from '#lib/travelTimes.ts';
import {
  COMPARISON_GROUPS,
  type ComparisonGroup,
  DESTINATIONS,
  type Destination,
} from './destinations.ts';

const MODE_NAMES = { walk: 'walk', bike: 'bike', transit: 'transit', drive: 'drive' } as const;

// Throws on a column naming a trip that doesn't exist, so a bad edit fails on startup and in tests.
export function toColumnGroups(
  destinations: readonly Destination[],
  groups: readonly ComparisonGroup[],
): ColumnGroup[] {
  return groups.map(({ destinationId, shortTitle, columns }) => {
    const destination = destinations.find(({ id }) => id === destinationId);
    if (!destination) throw new Error(`No destination ${destinationId}`);
    return {
      title: destination.title,
      shortTitle,
      columns: columns.map(({ tripIndex, icon, label }) => {
        const destinationTrip = destination.trips[tripIndex];
        if (!destinationTrip) throw new Error(`No trip ${tripIndex} to ${destinationId}`);
        const mode = MODE_NAMES[destinationTrip.trip.mode];
        const detail = [mode, destinationTrip.label].filter(Boolean).join(', ');
        return {
          key: [destinationId, mode, label?.toLowerCase()].filter(Boolean).join('-'),
          destinationId,
          tripIndex,
          icon,
          label,
          title: `${destination.title}: ${detail}`,
        };
      }),
    };
  });
}

export const TABLE_GROUPS = toColumnGroups(DESTINATIONS, COMPARISON_GROUPS);

// `trips` lines up with the destination's trips by position, as its fingerprint matched.
export function timeCell(
  results: readonly DestinationResult[],
  { destinationId, tripIndex }: TimeColumn,
): TimeCell {
  const trip = results.find(({ id }) => id === destinationId)?.trips[tripIndex];
  if (!trip) return { kind: 'missing' };
  const { route, goal } = trip;
  return {
    kind: 'trip',
    minutes: route.mode === 'unavailable' ? null : route.timeMinutes,
    status: goal && goalStatus(route, goal),
  };
}
