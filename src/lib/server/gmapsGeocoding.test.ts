import { describe, expect, test, vi } from 'vitest';
import geocodeResponse from '#tests/fixtures/google/geocode.json';
import { geocode, parseGeocodeResponse } from './gmapsGeocoding';

vi.mock('$app/env/private', () => ({ GOOGLE_MAPS_TOKEN: 'test-key' }));

describe('geocode', () => {
  test('encodes the address and key into the query string', async () => {
    const fetchMock = vi.fn(async (_url: URL) => new Response('{"status":"X","results":[]}'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocode('1 Madison Ave, New York')).rejects.toThrow();

    expect(fetchMock.mock.calls[0]?.[0].href).toBe(
      'https://maps.googleapis.com/maps/api/geocode/json?key=test-key&address=1+Madison+Ave%2C+New+York',
    );
  });

  test('keeps the key out of the error when Google rejects the request', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 403 }));

    const error: Error = await geocode('A').catch((e) => e);

    expect(error.message).toBe('Geocoding returned 403');
  });
});

describe('parseGeocodeResponse', () => {
  test('reads the location', () => {
    expect(parseGeocodeResponse(geocodeResponse)).toEqual({
      latitude: 40.7410681,
      longitude: -73.987636,
    });
  });

  test('reports the status when there are no results', () => {
    expect(() => parseGeocodeResponse({ status: 'ZERO_RESULTS', results: [] })).toThrow(
      'Unexpected geocoding response: ZERO_RESULTS with 0 results',
    );
  });
});
