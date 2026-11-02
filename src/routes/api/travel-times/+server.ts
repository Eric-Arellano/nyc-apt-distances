import { error, type RequestHandler } from '@sveltejs/kit';
import { fakeMaps } from '#lib/server/fakeMaps.ts';
import { geocode } from '#lib/server/gmapsGeocoding.ts';
import { computeRoute } from '#lib/server/gmapsRouting.ts';
import { computeTravelTimes } from '#lib/server/travelTimes.ts';
import { MOCK } from '$app/env/private';

export const GET: RequestHandler = async ({ url }) => {
  const address = url.searchParams.get('street-address');
  if (!address) {
    throw error(400, '`street-address` parameter is required');
  }
  return Response.json(
    await computeTravelTimes(address, MOCK ? fakeMaps : { geocode, computeRoute }),
  );
};
