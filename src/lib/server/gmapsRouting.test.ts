import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import bike from '#tests/fixtures/google/bike.json';
import transitBus from '#tests/fixtures/google/transit-bus.json';
import transitMetroNorth from '#tests/fixtures/google/transit-metro-north.json';
import transitNoRoute from '#tests/fixtures/google/transit-no-route.json';
import transitTransfer from '#tests/fixtures/google/transit-transfer.json';
import walk from '#tests/fixtures/google/walk.json';
import { DayOfWeek } from './departureTime';
import { computeRoute, parseActiveTransportRoute, parseTransitRoute } from './gmapsRouting';

vi.mock('$app/env/private', () => ({ GOOGLE_MAPS_TOKEN: 'test-key' }));

// Defaults to Google's real reply when it finds no route.
function stubFetch(response = Response.json(transitNoRoute)) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentRequest(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  return { url, headers: init?.headers, body: JSON.parse(String(init?.body)) };
}

describe('computeRoute for a bike trip', () => {
  test('sends the mode with a key and field mask', async () => {
    const fetchMock = stubFetch();

    await expect(computeRoute({ origin: 'A', dest: 'B', trip: { mode: 'bike' } })).resolves.toEqual(
      {
        mode: 'unavailable',
        tripMode: 'bike',
      },
    );

    expect(sentRequest(fetchMock)).toEqual({
      url: 'https://routes.googleapis.com/directions/v2:computeRoutes',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': 'test-key',
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: {
        origin: { address: 'A' },
        destination: { address: 'B' },
        travelMode: 'BICYCLE',
      },
    });
  });

  test('adds time to get the bike out', async () => {
    stubFetch(Response.json(bike));

    await expect(computeRoute({ origin: 'A', dest: 'B', trip: { mode: 'bike' } })).resolves.toEqual(
      {
        mode: 'bike',
        timeMinutes: 29,
        distanceMiles: 3.6,
      },
    );
  });

  test('throws with the status and body when Google rejects the request', async () => {
    stubFetch(new Response('field mask required', { status: 400 }));

    await expect(computeRoute({ origin: 'A', dest: 'B', trip: { mode: 'walk' } })).rejects.toThrow(
      'computeRoutes returned 400: field mask required',
    );
  });
});

describe('computeRoute for a transit trip', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-04T12:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('arrives by the next target time, in RFC 3339', async () => {
    const fetchMock = stubFetch();

    await expect(
      computeRoute({
        origin: 'A',
        dest: 'B',
        trip: { mode: 'transit', arriveBy: { day: DayOfWeek.Monday, hour: 8, minute: 45 } },
      }),
    ).resolves.toEqual({ mode: 'unavailable', tripMode: 'transit' });

    expect(sentRequest(fetchMock).body).toEqual({
      origin: { address: 'A' },
      destination: { address: 'B' },
      travelMode: 'TRANSIT',
      arrivalTime: '2026-11-09T13:45:00.000Z',
    });
  });
});

describe('parseActiveTransportRoute', () => {
  test('reads a walk response', () => {
    expect(parseActiveTransportRoute(walk, 'walk')).toEqual({
      mode: 'walk',
      timeMinutes: 10,
      distanceMiles: 0.4,
    });
  });

  test('reads a bike response', () => {
    expect(parseActiveTransportRoute(bike, 'bike')).toEqual({
      mode: 'bike',
      timeMinutes: 27,
      distanceMiles: 3.6,
    });
  });

  test('reads no route as unavailable', () => {
    expect(parseActiveTransportRoute({}, 'walk')).toEqual({
      mode: 'unavailable',
      tripMode: 'walk',
    });
  });

  test('throws on more than one route', () => {
    expect(() => parseActiveTransportRoute({ routes: [{}, {}] }, 'walk')).toThrow(
      'Unexpected number of routes: 2',
    );
  });

  test('throws on a route without a duration', () => {
    expect(() => parseActiveTransportRoute({ routes: [{}] }, 'walk')).toThrow(
      'Unexpected route duration: undefined',
    );
  });

  test('reads an omitted distance as zero', () => {
    expect(parseActiveTransportRoute({ routes: [{ duration: '0s' }] }, 'walk')).toEqual({
      mode: 'walk',
      timeMinutes: 0,
      distanceMiles: 0,
    });
  });
});

describe('parseTransitRoute', () => {
  test('names a bus line by its short name', () => {
    expect(parseTransitRoute(transitBus)).toEqual({
      mode: 'transit',
      timeMinutes: 25,
      rides: [{ line: '40', vehicle: 'bus' }],
    });
  });

  test('names a line without a short name by its full name', () => {
    expect(parseTransitRoute(transitMetroNorth)).toEqual({
      mode: 'transit',
      timeMinutes: 42,
      rides: [{ line: 'Harlem', vehicle: 'train' }],
    });
  });

  test('joins the lines of a trip with a transfer', () => {
    expect(parseTransitRoute(transitTransfer)).toEqual({
      mode: 'transit',
      timeMinutes: 80,
      rides: [
        { line: 'Harlem', vehicle: 'train' },
        { line: '5', vehicle: 'train' },
      ],
    });
  });

  test('reads no route as unavailable', () => {
    expect(parseTransitRoute(transitNoRoute)).toEqual({ mode: 'unavailable', tripMode: 'transit' });
  });

  test('reads a trip with only walking steps as walking', () => {
    const response = { routes: [{ duration: '45s', legs: [{ steps: [{ travelMode: 'WALK' }] }] }] };
    expect(parseTransitRoute(response)).toEqual({ mode: 'transit', timeMinutes: 1, rides: [] });
  });

  test('reads omitted steps as walking', () => {
    expect(parseTransitRoute({ routes: [{ duration: '120s', legs: [{}] }] })).toEqual({
      mode: 'transit',
      timeMinutes: 2,
      rides: [],
    });
  });

  test('labels a transit step whose line has no name or vehicle as an unnamed train', () => {
    const response = {
      routes: [{ duration: '600s', legs: [{ steps: [{ travelMode: 'TRANSIT' }] }] }],
    };
    expect(parseTransitRoute(response)).toEqual({
      mode: 'transit',
      timeMinutes: 10,
      rides: [{ line: 'unnamed line', vehicle: 'train' }],
    });
  });

  test('throws on anything but one leg', () => {
    expect(() => parseTransitRoute({ routes: [{ duration: '60s' }] })).toThrow(
      'Unexpected number of legs: 0',
    );
  });
});
