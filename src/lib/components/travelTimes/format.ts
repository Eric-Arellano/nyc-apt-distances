import type { Goal, Ride, Route } from '#lib/travelTimes.ts';

export function goalText({ strictness, idealMinutes, maxMinutes }: Goal): string {
  const limit = `${strictness === 'must' ? 'Must' : 'Should'} be within ${maxMinutes} minutes`;
  return idealMinutes === undefined ? limit : `${limit}; ideally within ${idealMinutes} minutes`;
}

/**
 * Describes a transit route's time and rides. Bee-Line lines are numbers, so a bus is named as one
 * rather than passing for a subway line.
 */
export function transitLines(rides: readonly Ride[]): string {
  return rides.map(({ line, vehicle }) => (vehicle === 'bus' ? `${line} bus` : line)).join(' -> ');
}

function describeTransit(timeMinutes: number, rides: readonly Ride[]): [string, string] {
  if (rides.length === 0) return ['🚆', `${timeMinutes} minutes by walking`];
  const icon = rides.every(({ vehicle }) => vehicle === 'bus') ? '🚌' : '🚆';
  return [icon, `${timeMinutes} minutes on the ${transitLines(rides)}`];
}

const NO_ROUTE: Record<Extract<Route, { mode: 'unavailable' }>['tripMode'], [string, string]> = {
  walk: ['🚶', 'No walking route'],
  bike: ['🚴', 'No bike route'],
  transit: ['🚆', 'No transit route'],
  drive: ['🚗', 'No driving route'],
};

function describeRoute(route: Route): [string, string] {
  switch (route.mode) {
    case 'transit':
      return describeTransit(route.timeMinutes, route.rides);
    case 'bike':
      return ['🚴', `${route.timeMinutes} minutes (${route.distanceMiles} miles)`];
    case 'drive':
      return ['🚗', `${route.timeMinutes} minutes (${route.distanceMiles} miles)`];
    case 'walk':
      return ['🚶', `${route.timeMinutes} minutes (${route.distanceMiles} miles)`];
    case 'unavailable':
      return NO_ROUTE[route.tripMode];
  }
}

export function routeIcon(route: Route): string {
  return describeRoute(route)[0];
}

export function formatRoute(route: Route, label?: string): string {
  const [icon, text] = describeRoute(route);
  return label ? `${icon} ${label}: ${text}` : `${icon} ${text}`;
}
