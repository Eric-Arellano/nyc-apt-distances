export type Route =
  | { mode: 'walk' | 'bike'; timeMinutes: number; distanceMiles: number }
  | { mode: 'transit'; timeMinutes: number; summary: string | null }; // null: all walking

export interface TravelTimes {
  work: {
    walk: Route;
    bike: Route;
    transit: Route;
  };
  subwayStop: {
    closest: {
      name: string;
      lines: string[];
    };
    walk: Route;
  };
  park: {
    closest: {
      name: string;
    };
    walk: Route;
  };
  farmersMarket: {
    closest: {
      name: string;
    };
    walk: Route;
  };
  parkSlope: {
    transit: Route;
  };
  williamsburg: {
    transit: Route;
  };
  downtownBrooklyn: {
    transit: Route;
  };
  jacksonHeights: {
    transit: Route;
  };
  astoria: {
    transit: Route;
  };
  jerseyCity: {
    transit: Route;
  };
  mottHaven: {
    transit: Route;
  };
}

export type GoalStatus = 'met' | 'partial' | 'unmet';
