import type { Route } from '#lib/types.ts';
import { getNextDateTime, type TargetDate } from './departureTime';
import { fetchGoogle } from './gmapsFetch';
import { requireGmapsToken } from './gmapsToken';
import { MODES } from './routeModes';

const COMPUTE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Proto3 JSON omits zero values and empty lists, so a field the mask asked for can still be absent.
export interface ComputeRoutesResponse {
  routes?: {
    duration?: string;
    distanceMeters?: number;
    legs?: {
      steps?: {
        travelMode?: string;
        transitDetails?: { transitLine?: { name?: string; nameShort?: string } };
      }[];
    }[];
  }[];
}

type GoogleRoute = NonNullable<ComputeRoutesResponse['routes']>[number];

async function computeRoutes(
  body: Record<string, unknown>,
  fieldMask: string,
): Promise<ComputeRoutesResponse> {
  const response = await fetchGoogle(COMPUTE_ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': requireGmapsToken(),
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`computeRoutes returned ${response.status}: ${await response.text()}`);
  }
  return await response.json();
}

// No route comes back as `{}`, for transit trips with no service and in principle for any mode.
function onlyRoute(response: ComputeRoutesResponse): GoogleRoute | undefined {
  const routes = response.routes ?? [];
  if (routes.length > 1) {
    throw new Error(`Unexpected number of routes: ${routes.length}`);
  }
  return routes[0];
}

function durationToMinutes(duration: string | undefined): number {
  const seconds = Number(duration?.replace(/s$/, ''));
  if (Number.isNaN(seconds)) {
    throw new Error(`Unexpected route duration: ${duration}`);
  }
  return Math.round(seconds / 60);
}

function metersToMi(meters: number): number {
  return Math.round(meters * 0.0006213712 * 10) / 10;
}

export function parseActiveTransportRoute(
  response: ComputeRoutesResponse,
  mode: 'walk' | 'bike',
): Route {
  const route = onlyRoute(response);
  if (!route) return { mode: 'unavailable', tripMode: mode };
  return {
    mode,
    timeMinutes: durationToMinutes(route.duration),
    distanceMiles: metersToMi(route.distanceMeters ?? 0),
  };
}

export function parseTransitRoute(response: ComputeRoutesResponse): Route {
  const route = onlyRoute(response);
  if (!route) return { mode: 'unavailable', tripMode: 'transit' };
  const leg = route.legs?.[0];
  if (!leg || route.legs?.length !== 1) {
    throw new Error(`Unexpected number of legs: ${route.legs?.length ?? 0}`);
  }

  const summary = (leg.steps ?? [])
    .filter((step) => step.travelMode === 'TRANSIT')
    .map(({ transitDetails }) => {
      const line = transitDetails?.transitLine;
      const name = line?.nameShort ?? line?.name ?? 'unnamed line';
      return name.replace(' Line', '').replace(' Train', '');
    })
    .join(' -> ');
  return {
    mode: 'transit',
    timeMinutes: durationToMinutes(route.duration),
    summary: summary || null,
  };
}

export type Trip = { mode: 'walk' | 'bike' } | { mode: 'transit'; departure: TargetDate };

export async function computeRoute(options: {
  origin: string;
  dest: string;
  trip: Trip;
}): Promise<Route> {
  const { origin, dest, trip } = options;
  const { travelMode, fieldMask, bufferMinutes } = MODES[trip.mode];
  const response = await computeRoutes(
    {
      origin: { address: origin },
      destination: { address: dest },
      travelMode,
      ...(trip.mode === 'transit' && {
        departureTime: getNextDateTime(trip.departure).toUTC().toISO(),
      }),
    },
    fieldMask,
  );
  const route =
    trip.mode === 'transit'
      ? parseTransitRoute(response)
      : parseActiveTransportRoute(response, trip.mode);
  if (route.mode === 'unavailable') return route;
  return { ...route, timeMinutes: route.timeMinutes + bufferMinutes };
}
