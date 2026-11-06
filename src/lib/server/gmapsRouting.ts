import { DateTime } from 'luxon';
import type { Ride, Route } from '#lib/types.ts';
import { fetchGoogle } from './gmapsFetch';
import { requireGmapsToken } from './gmapsToken';
import { MODES } from './routeModes';
import { nextOccurrence, type WeeklyTime } from './weeklyTime';

const COMPUTE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Google's `TransitVehicle.TransitVehicleType` values for buses. Every other type reads as a train.
const BUS_TYPES = ['BUS', 'INTERCITY_BUS', 'TROLLEYBUS'];

// Proto3 JSON omits zero values and empty lists, so a field the mask asked for can still be absent.
export interface ComputeRoutesResponse {
  routes?: {
    duration?: string;
    distanceMeters?: number;
    legs?: {
      steps?: {
        travelMode?: string;
        staticDuration?: string;
        transitDetails?: {
          stopDetails?: { arrivalTime?: string };
          transitLine?: { name?: string; nameShort?: string; vehicle?: { type?: string } };
        };
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

function durationToSeconds(duration: string | undefined): number {
  const seconds = Number(duration?.replace(/s$/, ''));
  if (Number.isNaN(seconds)) {
    throw new Error(`Unexpected route duration: ${duration}`);
  }
  return seconds;
}

function durationToMinutes(duration: string | undefined): number {
  return Math.round(durationToSeconds(duration) / 60);
}

type Step = NonNullable<NonNullable<GoogleRoute['legs']>[number]['steps']>[number];

// Google's `duration` stops when the trip arrives, but arriving early still spends that time, so
// it counts. An all-walking trip keeps no schedule, so it has no wait.
function waitSeconds(steps: readonly Step[], arriveBy: DateTime): number {
  const lastRide = steps.findLastIndex((step) => step.travelMode === 'TRANSIT');
  if (lastRide === -1) return 0;
  const rideArrival = steps[lastRide]?.transitDetails?.stopDetails?.arrivalTime;
  if (!rideArrival) throw new Error('Transit step has no arrival time');
  const walkAfterSeconds = steps
    .slice(lastRide + 1)
    .reduce((total, step) => total + durationToSeconds(step.staticDuration), 0);
  const arrival = DateTime.fromISO(rideArrival).plus({ seconds: walkAfterSeconds });
  // Summed step durations can overshoot Google's own total by under a minute, landing past the
  // target; that is rounding, not a late arrival.
  return Math.max(0, arriveBy.diff(arrival, 'seconds').seconds);
}

function metersToMi(meters: number): number {
  return Math.round(meters * 0.0006213712 * 10) / 10;
}

export function parseDistanceRoute(
  response: ComputeRoutesResponse,
  mode: 'walk' | 'bike' | 'drive',
): Route {
  const route = onlyRoute(response);
  if (!route) return { mode: 'unavailable', tripMode: mode };
  return {
    mode,
    timeMinutes: durationToMinutes(route.duration),
    distanceMiles: metersToMi(route.distanceMeters ?? 0),
  };
}

export function parseTransitRoute(response: ComputeRoutesResponse, arriveBy: DateTime): Route {
  const route = onlyRoute(response);
  if (!route) return { mode: 'unavailable', tripMode: 'transit' };
  const leg = route.legs?.[0];
  if (!leg || route.legs?.length !== 1) {
    throw new Error(`Unexpected number of legs: ${route.legs?.length ?? 0}`);
  }

  const steps = leg.steps ?? [];
  const rides = steps
    .filter((step) => step.travelMode === 'TRANSIT')
    .map(({ transitDetails }): Ride => {
      const line = transitDetails?.transitLine;
      const name = line?.nameShort ?? line?.name ?? 'unnamed line';
      return {
        line: name.replace(' Line', '').replace(' Train', ''),
        vehicle: BUS_TYPES.includes(line?.vehicle?.type ?? '') ? 'bus' : 'train',
      };
    });
  const seconds = durationToSeconds(route.duration) + waitSeconds(steps, arriveBy);
  return { mode: 'transit', timeMinutes: Math.round(seconds / 60), rides };
}

// Google takes `arrivalTime` only for transit, and never with `departureTime`, so a drive departs
// at a time rather than arriving by one.
export type Trip =
  | { mode: 'walk' | 'bike' }
  | { mode: 'transit'; arriveBy: WeeklyTime }
  | { mode: 'drive'; departAt: WeeklyTime };

async function requestRoute({
  origin,
  dest,
  trip,
}: {
  origin: string;
  dest: string;
  trip: Trip;
}): Promise<Route> {
  const { fieldMask, bufferMinutes: _, ...modeFields } = MODES[trip.mode];
  const body = { origin: { address: origin }, destination: { address: dest }, ...modeFields };
  if (trip.mode === 'transit') {
    const arriveBy = nextOccurrence(trip.arriveBy);
    const response = await computeRoutes(
      { ...body, arrivalTime: arriveBy.toUTC().toISO() },
      fieldMask,
    );
    return parseTransitRoute(response, arriveBy);
  }
  if (trip.mode === 'drive') {
    const departureTime = nextOccurrence(trip.departAt).toUTC().toISO();
    return parseDistanceRoute(await computeRoutes({ ...body, departureTime }, fieldMask), 'drive');
  }
  return parseDistanceRoute(await computeRoutes(body, fieldMask), trip.mode);
}

export async function computeRoute(options: {
  origin: string;
  dest: string;
  trip: Trip;
}): Promise<Route> {
  const route = await requestRoute(options);
  if (route.mode === 'unavailable') return route;
  return { ...route, timeMinutes: route.timeMinutes + MODES[options.trip.mode].bufferMinutes };
}
