import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import bike from '#tests/fixtures/google/bike.json';
import drive from '#tests/fixtures/google/drive.json';
import geocode from '#tests/fixtures/google/geocode.json';
import geocodeZeroResults from '#tests/fixtures/google/geocode-zero-results.json';
import transit from '#tests/fixtures/google/transit-transfer.json';
import walk from '#tests/fixtures/google/walk.json';
import { DESTINATIONS } from './destinations';
import { fakeMaps } from './fakeMaps';
import { lookUpTravelTimes } from './lookUpTravelTimes';
import { googleMaps, type Maps } from './travelTimes';

const GOOGLE = googleMaps('test-key');

const ROUTE_FIXTURES: Record<string, unknown> = {
  WALK: walk,
  BICYCLE: bike,
  TRANSIT: transit,
  DRIVE: drive,
};

async function fakeGoogle(url: URL | string, init?: RequestInit) {
  if (String(url).includes('geocode')) return Response.json(geocode);
  const { travelMode } = JSON.parse(String(init?.body));
  return Response.json(ROUTE_FIXTURES[travelMode]);
}

async function destinationIds(maps: Maps) {
  const results = await lookUpTravelTimes('1 Main St', maps);
  return results.map(({ id }) => id);
}

describe('lookUpTravelTimes', () => {
  const fetchMock = vi.fn(fakeGoogle);

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test.each([
    ['an empty address', ''],
    ['a missing address', undefined],
    ['a non-string', { address: '1 Main St' }],
  ])('refuses %s without calling Google', async (_, address) => {
    await expect(lookUpTravelTimes(address, GOOGLE)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('with Google', () => {
    test('answers from Google', async () => {
      expect(await destinationIds(GOOGLE)).toEqual(DESTINATIONS.map(({ id }) => id));
      expect(fetchMock).toHaveBeenCalled();
    });

    test('refuses an address Google cannot find', async () => {
      fetchMock.mockImplementationOnce(async () => Response.json(geocodeZeroResults));

      await expect(lookUpTravelTimes('nowhere', GOOGLE)).rejects.toEqual({
        status: 400,
        body: { message: 'Google could not find that address.', status: 400 },
      });
    });
  });

  describe('with the fake maps', () => {
    test('answers without calling Google', async () => {
      expect(await destinationIds(fakeMaps)).toEqual(DESTINATIONS.map(({ id }) => id));
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
