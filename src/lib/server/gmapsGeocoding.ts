import { error } from '@sveltejs/kit';
import { fetchGoogle } from './gmapsFetch';
import { requireGmapsToken } from './gmapsToken';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// A misspelled street comes back as the whole town, marked `partial_match`, rather than as
// ZERO_RESULTS. Its centre would quietly stand in for the apartment when picking the closest place.
const SPECIFIC_TYPES = ['street_address', 'premise', 'subpremise', 'establishment'];

export interface GeocodeResponse {
  status: string;
  results: {
    formatted_address: string;
    types: string[];
    address_components: { long_name: string; types: string[] }[];
    geometry: { location: { lat: number; lng: number } };
  }[];
}

export function parseGeocodeResponse(
  response: GeocodeResponse,
  expectedCounty: string,
): {
  latitude: number;
  longitude: number;
} {
  const { status, results } = response;
  if (status === 'ZERO_RESULTS') {
    throw error(400, 'Google could not find that address.');
  }
  // Several results means an ambiguous address, and Google ranks its best guess first.
  const result = results[0];
  if (!result) {
    throw new Error(`Unexpected geocoding response: ${status} with no results`);
  }
  if (!result.types.some((type) => SPECIFIC_TYPES.includes(type))) {
    throw error(400, `Google only matched "${result.formatted_address}", not a street address.`);
  }
  const county = result.address_components.find(({ types }) =>
    types.includes('administrative_area_level_2'),
  )?.long_name;
  if (county !== expectedCounty) {
    throw error(
      400,
      `Google placed that address at "${result.formatted_address}", outside ${expectedCounty}.`,
    );
  }
  const { lat, lng } = result.geometry.location;
  return {
    latitude: lat,
    longitude: lng,
  };
}

export async function geocode(
  address: string,
  expectedCounty: string,
): Promise<{ latitude: number; longitude: number }> {
  const url = new URL(GEOCODE_URL);
  url.search = new URLSearchParams({ key: requireGmapsToken(), address }).toString();

  // `url` holds the key, so it must stay out of every error and log line here.
  const response = await fetchGoogle(url);
  if (!response.ok) {
    throw new Error(`Geocoding returned ${response.status}`);
  }
  return parseGeocodeResponse(await response.json(), expectedCounty);
}
