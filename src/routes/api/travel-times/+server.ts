import { error, json, type RequestHandler } from '@sveltejs/kit';

import type { TravelTimes } from '$lib/types';
import {
	computeChurch,
	computeFractal,
	computePark,
	computePartner,
	computeSubwayStop,
	computeWork
} from '$lib/server/destinations';
import { USE_MOCK_DATA } from '$lib/server/env';
import { MOCK_DATA } from '$lib/mockData';

export const GET: RequestHandler = async ({ url }) => {
	if (USE_MOCK_DATA) {
		return json(MOCK_DATA);
	}

	const address = url.searchParams.get('street-address');
	if (!address) {
		throw error(400, '`street-address` parameter is required');
	}
	const origin = `${address}, New York, NY`;

	const result: TravelTimes = {
		work: await computeWork(origin),
		partner: await computePartner(origin),
		subwayStop: await computeSubwayStop(origin),
		park: await computePark(origin),
		fractal: await computeFractal(origin),
		church: await computeChurch(origin)
	};
	return json(result);
};
