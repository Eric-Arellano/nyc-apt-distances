export interface ActiveTransportRoute {
	timeMinutes: number;
	distanceMiles: number;
}

export interface TransitRoute {
	timeMinutes: number;
	summary: string;
}

export interface TravelTimes {
	work: {
		walk: ActiveTransportRoute;
		bike: ActiveTransportRoute;
		transit: TransitRoute;
	};
	partner: {
		walk: ActiveTransportRoute;
		transit: TransitRoute;
	};
	subwayStop: {
		closest: {
			name: string;
			lines: string[];
		};
		walk: ActiveTransportRoute;
	};
	park: {
		closest: {
			name: string;
		};
		walk: ActiveTransportRoute;
	};
	farmersMarket: {
		closest: {
			name: string;
		};
		walk: ActiveTransportRoute;
	};
	fractal: {
		transit: TransitRoute;
	};
	church: {
		transit: TransitRoute;
	};
}

export type TravelTimesRequest = { task: Promise<TravelTimes> | null };

export type GoalStatus = 'met' | 'partial' | 'unmet';
