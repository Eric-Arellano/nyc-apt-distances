import { fetchGoogle } from './gmapsFetch';
import { requireGmapsToken } from './gmapsToken';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface GeocodeResponse {
  status: string;
  results: { geometry: { location: { lat: number; lng: number } } }[];
}

export function parseGeocodeResponse(response: GeocodeResponse): {
  latitude: number;
  longitude: number;
} {
  const { status, results } = response;
  const result = results[0];
  if (!result || results.length !== 1) {
    throw new Error(`Unexpected geocoding response: ${status} with ${results.length} results`);
  }
  const { lat, lng } = result.geometry.location;
  return {
    latitude: lat,
    longitude: lng,
  };
}

export async function geocode(address: string): Promise<{ latitude: number; longitude: number }> {
  const url = new URL(GEOCODE_URL);
  url.search = new URLSearchParams({ key: requireGmapsToken(), address }).toString();

  // `url` holds the key, so it must stay out of every error and log line here.
  const response = await fetchGoogle(url);
  if (!response.ok) {
    throw new Error(`Geocoding returned ${response.status}`);
  }
  return parseGeocodeResponse(await response.json());
}
