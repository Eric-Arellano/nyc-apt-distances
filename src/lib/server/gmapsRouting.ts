import type { Route } from '#lib/types.ts';
import { getNextDateTime, type TargetDate } from './departureTime';
import { fetchGoogle } from './gmapsFetch';
import { requireGmapsToken } from './gmapsToken';

const COMPUTE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Proto3 JSON omits zero values and empty lists, so a field the mask asked for can still be absent.
export interface ComputeRoutesResponse {
  routes?: {
    duration?: string;
    distanceMeters?: number;
    legs?: {
      steps?: { transitDetails?: { transitLine?: { nameShort?: string } } }[];
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

function onlyRoute(response: ComputeRoutesResponse): GoogleRoute {
  const route = response.routes?.[0];
  if (!route || response.routes?.length !== 1) {
    throw new Error(`Unexpected number of routes: ${response.routes?.length ?? 0}`);
  }
  return route;
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
  return {
    mode,
    timeMinutes: durationToMinutes(route.duration),
    distanceMiles: metersToMi(route.distanceMeters ?? 0),
  };
}

export function parseTransitRoute(response: ComputeRoutesResponse): Route {
  const route = onlyRoute(response);
  const leg = route.legs?.[0];
  if (!leg || route.legs?.length !== 1) {
    throw new Error(`Unexpected number of legs: ${route.legs?.length ?? 0}`);
  }

  const summary = (leg.steps ?? [])
    .map((step) =>
      step.transitDetails?.transitLine?.nameShort?.replace(' Line', '').replace(' Train', ''),
    )
    .filter((name) => name !== undefined)
    .join(' -> ');
  return {
    mode: 'transit',
    timeMinutes: durationToMinutes(route.duration),
    summary: summary || null,
  };
}

export type Trip = { mode: 'walk' | 'bike' } | { mode: 'transit'; departure: TargetDate };

const MODES = {
  walk: {
    travelMode: 'WALK',
    fieldMask: 'routes.duration,routes.distanceMeters',
    bufferMinutes: 0,
  },
  // The buffer is time to get the bike out and locked up.
  bike: {
    travelMode: 'BICYCLE',
    fieldMask: 'routes.duration,routes.distanceMeters',
    bufferMinutes: 2,
  },
  transit: {
    travelMode: 'TRANSIT',
    fieldMask:
      'routes.duration,routes.description,routes.legs.steps.transitDetails.transitLine.nameShort',
    bufferMinutes: 0,
  },
} as const;

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
  return { ...route, timeMinutes: route.timeMinutes + bufferMinutes };
}
