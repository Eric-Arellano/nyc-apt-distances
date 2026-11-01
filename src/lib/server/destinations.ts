import type TravelTimes from '#lib/components/travelTimes/index.ts';
import { FARMERS_MARKETS, PARKS, SUBWAY_STOPS } from './candidateLocations';
import { type CoordinatePoint, findClosest } from './closestDest';
import { DayOfWeek } from './departureTime';
import { computeActiveTransportRoute, computeTransitRoute } from './gmapsRouting';

export async function computeWork(origin: string): Promise<TravelTimes['work']> {
  const dest = '1 Madison Ave, New York, NY 10010';
  return {
    walk: await computeActiveTransportRoute({ origin, dest, mode: 'WALK' }),
    bike: await computeActiveTransportRoute({ origin, dest, mode: 'BICYCLE' }),
    transit: await computeTransitRoute({
      origin,
      dest,
      targetDeparture: { day: DayOfWeek.Monday, hour: 8, minute: 45 },
    }),
  };
}

export async function computeFarmersMarket(
  originAddr: string,
  originPoint: CoordinatePoint,
): Promise<TravelTimes['farmersMarket']> {
  const closest = findClosest(originPoint, FARMERS_MARKETS);
  const walk = await computeActiveTransportRoute({
    origin: originAddr,
    dest: closest.address,
    mode: 'WALK',
  });
  return { walk, closest: { name: closest.name } };
}

export async function computePark(
  originAddr: string,
  originPoint: CoordinatePoint,
): Promise<TravelTimes['park']> {
  const closest = findClosest(originPoint, PARKS);
  const walk = await computeActiveTransportRoute({
    origin: originAddr,
    dest: closest.address,
    mode: 'WALK',
  });
  return { walk, closest: { name: closest.name } };
}

export async function computeSubwayStop(
  originAddr: string,
  originPoint: CoordinatePoint,
): Promise<TravelTimes['subwayStop']> {
  const closest = findClosest(originPoint, SUBWAY_STOPS);
  const walk = await computeActiveTransportRoute({
    origin: originAddr,
    dest: closest.address,
    mode: 'WALK',
  });
  return { walk, closest: { name: closest.name, lines: closest.lines } };
}

export async function computeParkSlope(origin: string): Promise<TravelTimes['parkSlope]']> {
  const transit = await computeTransitRoute({
    origin,
    dest: 'Grand Army Plz, Brooklyn, NY 11238',
    targetDeparture: { day: DayOfWeek.Saturday, hour: 19, minute: 0 },
  });
  return { transit };
}

export async function computeWilliamsburg(origin: string): Promise<TravelTimes['williamsburg']> {
  const transit = await computeTransitRoute({
    origin,
    dest: '551 Driggs Ave, Brooklyn, NY 11211',
    targetDeparture: { day: DayOfWeek.Saturday, hour: 19, minute: 0 },
  });
  return { transit };
}

export async function computeDowntownBrooklyn(
  origin: string,
): Promise<TravelTimes['downtownBrooklyn']> {
  const transit = await computeTransitRoute({
    origin,
    dest: '409 Fulton St, Brooklyn, NY 11201',
    targetDeparture: { day: DayOfWeek.Saturday, hour: 19, minute: 0 },
  });
  return { transit };
}

export async function computeJacksonHeights(
  origin: string,
): Promise<TravelTimes['jacksonHeights']> {
  const transit = await computeTransitRoute({
    origin,
    dest: '74-01 Roosevelt Ave, Flushing, NY 11372',
    targetDeparture: { day: DayOfWeek.Saturday, hour: 19, minute: 0 },
  });
  return { transit };
}

export async function computeAstoria(origin: string): Promise<TravelTimes['astoria']> {
  const transit = await computeTransitRoute({
    origin,
    dest: '31-02 Astoria Blvd, Astoria, NY 11102',
    targetDeparture: { day: DayOfWeek.Saturday, hour: 19, minute: 0 },
  });
  return { transit };
}

export async function computeJerseyCity(origin: string): Promise<TravelTimes['jerseyCity']> {
  const transit = await computeTransitRoute({
    origin,
    dest: '90 Christopher Columbus Dr, Jersey City, NJ 07302',
    targetDeparture: { day: DayOfWeek.Saturday, hour: 19, minute: 0 },
  });
  return { transit };
}

export async function computeMottHaven(origin: string): Promise<TravelTimes['mottHaven']> {
  const transit = await computeTransitRoute({
    origin,
    dest: '500 Grand Concourse, Bronx, NY 10451',
    targetDeparture: { day: DayOfWeek.Saturday, hour: 19, minute: 0 },
  });
  return { transit };
}
