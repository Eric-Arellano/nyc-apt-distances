import * as v from 'valibot';
import { lookUpTravelTimes } from '#lib/server/lookUpTravelTimes.ts';
import { getMaps } from '#lib/server/maps.ts';
import { query } from '$app/server';

const Address = v.pipe(v.string(), v.trim(), v.nonEmpty());

export const getTravelTimes = query(Address, async (address) => {
  return await lookUpTravelTimes(address, getMaps());
});
