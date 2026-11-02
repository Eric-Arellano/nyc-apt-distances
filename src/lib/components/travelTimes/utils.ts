import type { GoalStatus, Route } from '#lib/types.ts';

export function goalStatus(
  routes: Array<{ timeMinutes: number }>,
  times: { idealMinutes: number; maxMinutes: number },
): GoalStatus {
  const minTime = Math.min(...routes.map((route) => route.timeMinutes));
  if (minTime <= times.idealMinutes) {
    return 'met';
  }
  if (minTime <= times.maxMinutes) {
    return 'partial';
  }
  return 'unmet';
}

export function formatRoute(
  route: Route,
  place?: { name: string; additionalInfo?: string },
): string {
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
  }
}
