import type { Goal, GoalStatus, Place, Ride, Route } from '#lib/types.ts';

export function goalStatus(routes: readonly Route[], goal: Goal): GoalStatus {
  // With no available route this is `Infinity`, so the goal is unmet.
  const minTime = Math.min(
    ...routes.flatMap((route) => (route.mode === 'unavailable' ? [] : [route.timeMinutes])),
  );
  if (minTime <= goal.idealMinutes) {
    return 'met';
  }
  if (minTime <= goal.maxMinutes) {
    return 'partial';
  }
  return 'unmet';
}

export function goalText(goal: Goal, routes: readonly Route[]): string {
  const { strictness, idealMinutes, maxMinutes } = goal;
  const limit = routes.every(
    (route) => (route.mode === 'unavailable' ? route.tripMode : route.mode) === 'walk',
  )
    ? `a ${maxMinutes}-minute walk`
    : `${maxMinutes} minutes`;
  return `${strictness === 'must' ? 'Must' : 'Should'} be within ${limit}; ideally within ${idealMinutes} minutes`;
}

// Bee-Line lines are numbers, so a bus is named as one rather than passing for a subway line.
function formatTransit(timeMinutes: number, rides: readonly Ride[]): string {
  if (rides.length === 0) return `🚆 ${timeMinutes} minutes by walking`;
  const emoji = rides.every(({ vehicle }) => vehicle === 'bus') ? '🚌' : '🚆';
  const lines = rides.map(({ line, vehicle }) => (vehicle === 'bus' ? `${line} bus` : line));
  return `${emoji} ${timeMinutes} minutes on the ${lines.join(' -> ')}`;
}

export function formatRoute(route: Route, place?: Place | null): string {
  switch (route.mode) {
    case 'transit':
      return formatTransit(route.timeMinutes, route.rides);
    case 'bike':
      return `🚴 ${route.timeMinutes} minutes (${route.distanceMiles} miles)`;
    case 'walk': {
      const to = place
        ? ` to ${place.name}${place.additionalInfo ? ` ${place.additionalInfo}` : ''}`
        : '';
      return `🚶 ${route.timeMinutes} minutes${to} (${route.distanceMiles} miles)`;
    }
    case 'unavailable':
      return {
        walk: '🚶 No walking route',
        bike: '🚴 No bike route',
        transit: '🚆 No transit route',
      }[route.tripMode];
  }
}
