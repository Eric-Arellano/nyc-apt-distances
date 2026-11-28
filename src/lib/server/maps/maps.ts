import type { Route } from '#lib/types.ts';
import { type GeocodedAddress, geocode } from './geocoding.ts';
import { computeRoute, type RouteOptions } from './routing.ts';

export interface Maps {
  geocode(address: string, expectedCounty: string): Promise<GeocodedAddress>;
  computeRoute(options: RouteOptions): Promise<Route>;
}

export function googleMaps(key: string): Maps {
  return {
    geocode: (address, expectedCounty) => geocode(key, address, expectedCounty),
    computeRoute: (options) => computeRoute(key, options),
  };
}
