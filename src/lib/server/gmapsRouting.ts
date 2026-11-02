import type { ActiveTransportRoute, TransitRoute } from '#lib/types.ts';
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

export function parseActiveTransportRoute(response: ComputeRoutesResponse): ActiveTransportRoute {
  const route = onlyRoute(response);
  return {
    timeMinutes: durationToMinutes(route.duration),
    distanceMiles: metersToMi(route.distanceMeters ?? 0),
  };
}

export function parseTransitRoute(response: ComputeRoutesResponse): TransitRoute {
  const route = onlyRoute(response);
  const leg = route.legs?.[0];
  if (!leg || route.legs?.length !== 1) {
    throw new Error(`Unexpected number of legs: ${route.legs?.length ?? 0}`);
  }

  const timeMinutes = durationToMinutes(route.duration);
  const summary = (leg.steps ?? [])
    .map((step) =>
      step.transitDetails?.transitLine?.nameShort?.replace(' Line', '').replace(' Train', ''),
    )
    .filter((name) => name !== undefined)
    .join(' -> ');
  if (!summary) return { timeMinutes, type: 'walking' };
  return {
    timeMinutes,
    type: 'transit',
    summary,
  };
}

export async function computeActiveTransportRoute(options: {
  origin: string;
  dest: string;
  mode: 'WALK' | 'BICYCLE';
}): Promise<ActiveTransportRoute> {
  const { origin, dest, mode } = options;
  const route = parseActiveTransportRoute(
    await computeRoutes(
      { origin: { address: origin }, destination: { address: dest }, travelMode: mode },
      'routes.duration,routes.distanceMeters',
    ),
  );

  // Add some buffer time to set up bike.
  const bufferTimeMinutes = mode === 'BICYCLE' ? 2 : 0;
  return { ...route, timeMinutes: route.timeMinutes + bufferTimeMinutes };
}

export async function computeTransitRoute(options: {
  origin: string;
  dest: string;
  targetDeparture: TargetDate;
}): Promise<TransitRoute> {
  const { origin, dest, targetDeparture } = options;
  return parseTransitRoute(
    await computeRoutes(
      {
        origin: { address: origin },
        destination: { address: dest },
        travelMode: 'TRANSIT',
        departureTime: getNextDateTime(targetDeparture).toUTC().toISO(),
      },
      'routes.duration,routes.description,routes.legs.steps.transitDetails.transitLine.nameShort',
    ),
  );
}
