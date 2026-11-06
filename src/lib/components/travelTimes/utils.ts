import type { Goal, GoalStatus, Place, Route } from '#lib/types.ts';

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

export function formatRoute(route: Route, place?: Place | null): string {
  switch (route.mode) {
    case 'transit':
      return `🚇 ${route.timeMinutes} minutes ${route.summary === null ? 'by walking' : `on the ${route.summary}`}`;
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
        transit: '🚇 No transit route',
      }[route.tripMode];
  }
}
