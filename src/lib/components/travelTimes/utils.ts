import type { ActiveTransportRoute, GoalStatus, TransitRoute } from '$lib/types';

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

export function transitRoute(route: TransitRoute): string {
  const mode = route.type === 'walking' ? 'by walking' : `on the ${route.summary}`;
  return `🚇 ${route.timeMinutes} minutes ${mode}`;
}

export function bikeRoute(route: ActiveTransportRoute): string {
  return `🚴 ${route.timeMinutes} minutes (${route.distanceMiles} miles)`;
}

export function walkRoute(
  route: ActiveTransportRoute,
  destination?: {
    name: string;
    additionalInfo?: string;
  },
): string {
  let result = `🚶 ${route.timeMinutes} minutes`;

  if (destination) {
    result += ` to ${destination.name}`;
    if (destination.additionalInfo) {
      result += ` ${destination.additionalInfo}`;
    }
  }

  result += ` (${route.distanceMiles} miles)`;
  return result;
}
