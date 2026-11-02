import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import bike from '#tests/fixtures/google/bike.json';
import transit from '#tests/fixtures/google/transit.json';
import transitWalking from '#tests/fixtures/google/transit-walking.json';
import walk from '#tests/fixtures/google/walk.json';
import { DayOfWeek } from './departureTime';
import { computeRoute, parseActiveTransportRoute, parseTransitRoute } from './gmapsRouting';

vi.mock('$app/env/private', () => ({ GOOGLE_MAPS_TOKEN: 'test-key' }));

// Stands in for an empty response, so these tests pin the request without inventing a Google reply.
function stubFetch(response = new Response('{}')) {
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

    await expect(computeRoute({ origin: 'A', dest: 'B', trip: { mode: 'bike' } })).rejects.toThrow(
      'Unexpected number of routes: 0',
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

  test('departs at the next target time, in RFC 3339', async () => {
    const fetchMock = stubFetch();

    await expect(
      computeRoute({
        origin: 'A',
        dest: 'B',
        trip: { mode: 'transit', departure: { day: DayOfWeek.Monday, hour: 8, minute: 45 } },
      }),
    ).rejects.toThrow('Unexpected number of routes: 0');

    expect(sentRequest(fetchMock).body).toEqual({
      origin: { address: 'A' },
      destination: { address: 'B' },
      travelMode: 'TRANSIT',
      departureTime: '2026-11-09T13:45:00.000Z',
    });
  });
});

describe('parseActiveTransportRoute', () => {
  test('reads a walk response', () => {
    expect(parseActiveTransportRoute(walk, 'walk')).toEqual({
      mode: 'walk',
      timeMinutes: 12,
      distanceMiles: 0.5,
    });
  });

  test('reads a bike response', () => {
    expect(parseActiveTransportRoute(bike, 'bike')).toEqual({
      mode: 'bike',
      timeMinutes: 4,
      distanceMiles: 0.6,
    });
  });

  test('throws on anything but one route', () => {
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
  test('joins the lines of a trip with a transfer', () => {
    expect(parseTransitRoute(transit)).toEqual({
      timeMinutes: 28,
      mode: 'transit',
      summary: '4 -> 6X',
    });
  });

  test('reads a trip with no lines as walking', () => {
    expect(parseTransitRoute(transitWalking)).toEqual({
      mode: 'transit',
      timeMinutes: 1,
      summary: null,
    });
  });

  test('throws on anything but one leg', () => {
    expect(() => parseTransitRoute({ routes: [{ duration: '60s' }] })).toThrow(
      'Unexpected number of legs: 0',
    );
  });

  test('reads omitted steps as walking', () => {
    expect(parseTransitRoute({ routes: [{ duration: '120s', legs: [{}] }] })).toEqual({
      mode: 'transit',
      timeMinutes: 2,
      summary: null,
    });
  });
});
