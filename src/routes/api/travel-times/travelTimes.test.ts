import type { RequestEvent } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DESTINATIONS } from '#lib/server/destinations.ts';
import type { DestinationResult } from '#lib/types.ts';
import bike from '#tests/fixtures/google/bike.json';
import geocode from '#tests/fixtures/google/geocode.json';
import geocodeZeroResults from '#tests/fixtures/google/geocode-zero-results.json';
import transit from '#tests/fixtures/google/transit-transfer.json';
import walk from '#tests/fixtures/google/walk.json';
import { GET } from './+server';

const env = vi.hoisted(() => ({ MOCK: false, GOOGLE_MAPS_TOKEN: 'test-key' }));
vi.mock('$app/env/private', () => env);

const ROUTE_FIXTURES: Record<string, unknown> = { WALK: walk, BICYCLE: bike, TRANSIT: transit };

async function fakeGoogle(url: URL | string, init?: RequestInit) {
  if (String(url).includes('geocode')) return Response.json(geocode);
  const { travelMode } = JSON.parse(String(init?.body));
  return Response.json(ROUTE_FIXTURES[travelMode]);
}

function get(search: string) {
  const url = new URL(`https://example.com/api/travel-times${search}`);
  return GET({ url } as unknown as RequestEvent) as Promise<Response>;
}

async function destinationIds(response: Response) {
  const results: DestinationResult[] = await response.json();
  return results.map(({ id }) => id);
}

describe('GET', () => {
  const fetchMock = vi.fn(fakeGoogle);

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test.each([
    ['missing', ''],
    ['empty', '?street-address='],
  ])('refuses a %s address without calling Google', async (_, search) => {
    await expect(get(search)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('with MOCK off', () => {
    beforeEach(() => {
      env.MOCK = false;
    });

    test('answers from Google', async () => {
      const response = await get('?street-address=1%20Main%20St');

      expect(await destinationIds(response)).toEqual(DESTINATIONS.map(({ id }) => id));
      expect(fetchMock).toHaveBeenCalled();
    });

    test('refuses an address Google cannot find', async () => {
      fetchMock.mockImplementationOnce(async () => Response.json(geocodeZeroResults));

      await expect(get('?street-address=nowhere')).rejects.toEqual({
        status: 400,
        body: { message: 'Google could not find that address.', status: 400 },
      });
    });
  });

  describe('with MOCK on', () => {
    beforeEach(() => {
      env.MOCK = true;
    });

    test('answers without calling Google', async () => {
      const response = await get('?street-address=1%20Main%20St');

      expect(await destinationIds(response)).toEqual(DESTINATIONS.map(({ id }) => id));
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
