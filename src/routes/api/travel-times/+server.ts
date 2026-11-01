import { error, json, type RequestHandler } from '@sveltejs/kit';
import { MOCK_DATA } from '$lib/mockData';
import {
  computeAstoria,
  computeDowntownBrooklyn,
  computeFarmersMarket,
  computeJacksonHeights,
  computeJerseyCity,
  computeMottHaven,
  computePark,
  computeParkSlope,
  computeSubwayStop,
  computeWilliamsburg,
  computeWork,
} from '$lib/server/destinations';
import { USE_MOCK_DATA } from '$lib/server/env';
import { geocode } from '$lib/server/gmapsGeocoding';
import type { TravelTimes } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
  if (USE_MOCK_DATA) {
    return json(MOCK_DATA);
  }

  const address = url.searchParams.get('street-address');
  if (!address) {
    throw error(400, '`street-address` parameter is required');
  }
  const originAddr = `${address}, New York, NY`;
  const originPoint = await geocode(originAddr);

  const result: TravelTimes = {
    work: await computeWork(originAddr),
    subwayStop: await computeSubwayStop(originAddr, originPoint),
    park: await computePark(originAddr, originPoint),
    farmersMarket: await computeFarmersMarket(originAddr, originPoint),
    parkSlope: await computeParkSlope(originAddr),
    williamsburg: await computeWilliamsburg(originAddr),
    downtownBrooklyn: await computeDowntownBrooklyn(originAddr),
    jacksonHeights: await computeJacksonHeights(originAddr),
    astoria: await computeAstoria(originAddr),
    jerseyCity: await computeJerseyCity(originAddr),
    mottHaven: await computeMottHaven(originAddr),
  };
  return json(result);
};
