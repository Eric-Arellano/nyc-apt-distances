import { error } from '@sveltejs/kit';
import type { DestinationResult } from '#lib/types.ts';
import { DESTINATIONS, ORIGIN_COUNTY } from './destinations';
import { computeTravelTimes, type Maps, toDestinationResults } from './travelTimes';

// `address` is `unknown` because its remote function is `'unchecked'`: anyone with a session can
// call that endpoint with any argument.
export async function lookUpTravelTimes(
  address: unknown,
  maps: Maps,
): Promise<DestinationResult[]> {
  if (typeof address !== 'string' || !address) error(400, 'Enter an address.');

  const { coordinates } = await maps.geocode(address, ORIGIN_COUNTY);
  const entries = await computeTravelTimes(address, coordinates, DESTINATIONS, maps);
  return toDestinationResults(entries, DESTINATIONS).results;
}
