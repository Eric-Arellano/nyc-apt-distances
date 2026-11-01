import { Client } from '@googlemaps/google-maps-services-js';

import { GMAPS_TOKEN } from './env';

const GEOCODING_CLIENT = new Client();

export async function geocode(address: string): Promise<{ latitude: number; longitude: number }> {
  const resp = await GEOCODING_CLIENT.geocode({
    params: { key: GMAPS_TOKEN, address: address },
  });
  const results = resp.data.results;
  if (results.length !== 1) {
    throw new Error(`Unexpected number of results: ${results}`);
  }
  const result = results[0];
  const { lat, lng } = result.geometry.location;
  return {
    latitude: lat,
    longitude: lng,
  };
}
