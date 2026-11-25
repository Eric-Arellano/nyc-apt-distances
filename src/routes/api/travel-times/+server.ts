import { error, type RequestHandler } from '@sveltejs/kit';
import { DESTINATIONS, ORIGIN_COUNTY } from '#lib/server/destinations.ts';
import { getMaps } from '#lib/server/maps.ts';
import { computeTravelTimes, toDestinationResults } from '#lib/server/travelTimes.ts';

export const GET: RequestHandler = async ({ url }) => {
  const address = url.searchParams.get('street-address');
  if (!address) {
    throw error(400, '`street-address` parameter is required');
  }
  const maps = getMaps();
  const { coordinates } = await maps.geocode(address, ORIGIN_COUNTY);
  const entries = await computeTravelTimes(address, coordinates, DESTINATIONS, maps);
  return Response.json(toDestinationResults(entries, DESTINATIONS));
};
