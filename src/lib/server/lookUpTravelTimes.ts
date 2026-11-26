import type { DestinationResult } from '#lib/types.ts';
import { DESTINATIONS, ORIGIN_COUNTY } from './destinations';
import type { Maps } from './maps';
import { computeTravelTimes, toDestinationResults } from './travelTimes';

export async function lookUpTravelTimes(address: string, maps: Maps): Promise<DestinationResult[]> {
  const { coordinates } = await maps.geocode(address, ORIGIN_COUNTY);
  const entries = await computeTravelTimes(address, coordinates, DESTINATIONS, maps);
  return toDestinationResults(entries, DESTINATIONS).results;
}
