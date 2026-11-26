import { lookUpTravelTimes } from '#lib/server/lookUpTravelTimes.ts';
import { getMaps } from '#lib/server/maps.ts';
import { query } from '$app/server';

// `'unchecked'` because a schema would need a validation library; `lookUpTravelTimes` checks it.
export const getTravelTimes = query('unchecked', (address: string) =>
  lookUpTravelTimes(address, getMaps()),
);
