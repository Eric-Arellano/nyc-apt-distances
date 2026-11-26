import * as v from 'valibot';
import { lookUpTravelTimes } from '#lib/server/lookUpTravelTimes.ts';
import { getMaps } from '#lib/server/maps.ts';
import { query } from '$app/server';

export const getTravelTimes = query(v.pipe(v.string(), v.trim(), v.nonEmpty()), (address) =>
  lookUpTravelTimes(address, getMaps()),
);
