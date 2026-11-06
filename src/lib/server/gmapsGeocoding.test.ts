import { describe, expect, test, vi } from 'vitest';
import geocodeResponse from '#tests/fixtures/google/geocode.json';
import partialMatch from '#tests/fixtures/google/geocode-partial-match.json';
import zeroResults from '#tests/fixtures/google/geocode-zero-results.json';
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

function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected a throw');
}

describe('parseGeocodeResponse', () => {
  const location = { latitude: 41.03035999999999, longitude: -73.7699654 };

  test('reads the location', () => {
    expect(parseGeocodeResponse(geocodeResponse)).toEqual(location);
  });

  test('takes the first of several results', () => {
    const results = [...geocodeResponse.results, ...partialMatch.results];
    expect(parseGeocodeResponse({ status: 'OK', results })).toEqual(location);
  });

  test('refuses an address Google cannot find with a 400', () => {
    expect(thrownBy(() => parseGeocodeResponse(zeroResults))).toEqual({
      status: 400,
      body: { message: 'Google could not find that address.', status: 400 },
    });
  });

  test('refuses a match coarser than a street address with a 400', () => {
    expect(thrownBy(() => parseGeocodeResponse(partialMatch))).toEqual({
      status: 400,
      body: {
        message: 'Google only matched "White Plains, NY, USA", not a street address.',
        status: 400,
      },
    });
  });

  test('reports the status when there are no results for another reason', () => {
    expect(() => parseGeocodeResponse({ status: 'REQUEST_DENIED', results: [] })).toThrow(
      'Unexpected geocoding response: REQUEST_DENIED with no results',
    );
  });
});
