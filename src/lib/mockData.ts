import type { TravelTimes } from './types';

export const MOCK_DATA: TravelTimes = {
  work: {
    walk: {
      timeMinutes: 18,
      distanceMiles: 1.5,
    },
    bike: {
      timeMinutes: 4,
      distanceMiles: 1.5,
    },
    transit: {
      timeMinutes: 7,
      type: 'transit',
      summary: 'N',
    },
  },
  subwayStop: {
    closest: {
      name: '14th St',
      lines: ['E', 'Q', 'R'],
    },
    walk: {
      timeMinutes: 6,
      distanceMiles: 0.3,
    },
  },
  park: {
    closest: {
      name: 'Union Square',
    },
    walk: {
      timeMinutes: 12,
      distanceMiles: 0.8,
    },
  },
  farmersMarket: {
    closest: {
      name: 'Union Square',
    },
    walk: {
      timeMinutes: 12,
      distanceMiles: 0.8,
    },
  },
  parkSlope: {
    transit: {
      timeMinutes: 18,
      type: 'transit',
      summary: '2',
    },
  },
  williamsburg: {
    transit: {
      timeMinutes: 18,
      type: 'transit',
      summary: '2',
    },
  },
  downtownBrooklyn: {
    transit: {
      timeMinutes: 18,
      type: 'transit',
      summary: '2',
    },
  },
  jacksonHeights: {
    transit: {
      timeMinutes: 18,
      type: 'transit',
      summary: '2',
    },
  },
  astoria: {
    transit: {
      timeMinutes: 18,
      type: 'transit',
      summary: '2',
    },
  },
  jerseyCity: {
    transit: {
      timeMinutes: 18,
      type: 'transit',
      summary: '2',
    },
  },
  mottHaven: {
    transit: {
      timeMinutes: 18,
      type: 'transit',
      summary: '2',
    },
  },
};
