import { error, type RequestHandler } from '@sveltejs/kit';
import { DESTINATIONS } from '#lib/server/destinations.ts';
import { fakeMaps } from '#lib/server/fakeMaps.ts';
import { requireGmapsToken } from '#lib/server/gmapsToken.ts';
import { computeTravelTimes, googleMaps } from '#lib/server/travelTimes.ts';
import { MOCK } from '$app/env/private';

export const GET: RequestHandler = async ({ url }) => {
  const address = url.searchParams.get('street-address');
  if (!address) {
    throw error(400, '`street-address` parameter is required');
  }
  return Response.json(
    await computeTravelTimes(
      address,
      DESTINATIONS,
      MOCK ? fakeMaps : googleMaps(requireGmapsToken()),
    ),
  );
};
