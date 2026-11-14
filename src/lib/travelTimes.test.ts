import { describe, expect, test, vi } from 'vitest';
import { getTravelTimes } from './travelTimes';

const navigation = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => navigation);

function stubResponse(response: Response) {
  vi.stubGlobal('fetch', async () => response);
}

describe('getTravelTimes', () => {
  test('returns the destinations', async () => {
    stubResponse(Response.json([]));

    expect(await getTravelTimes('1 Main St')).toEqual([]);
  });

  describe('when the server rejects the address', () => {
    test("throws the server's message", async () => {
      stubResponse(
        Response.json({ message: 'Google could not find that address.' }, { status: 400 }),
      );

      await expect(getTravelTimes('1 Main St')).rejects.toThrow(
        'Google could not find that address.',
      );
    });
  });

  describe('when the session has expired', () => {
    test('sends the user to the login page, to return here', async () => {
      vi.stubGlobal('location', new URL('https://example.com/?address=1+Main+St'));
      stubResponse(Response.json({ error: 'Unauthorized' }, { status: 401 }));

      await expect(getTravelTimes('1 Main St')).rejects.toThrow('Your session has expired.');
      expect(navigation.goto).toHaveBeenCalledExactlyOnceWith(
        '/login?redirectTo=%2F%3Faddress%3D1%2BMain%2BSt',
      );
    });
  });

  describe('when the server fails', () => {
    test('throws the status', async () => {
      stubResponse(new Response(null, { status: 500, statusText: 'Internal Error' }));

      await expect(getTravelTimes('1 Main St')).rejects.toThrow(
        'Failed to fetch travel times: 500 Internal Error',
      );
    });
  });
});
