import { error } from '@sveltejs/kit';
import { describe, expect, test, vi } from 'vitest';
import { lookUpTravelTimes } from './travelTimes';

const navigation = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => navigation);

const remote = vi.hoisted(() => ({ getTravelTimes: vi.fn() }));
vi.mock('./travelTimes.remote', () => remote);

/** Makes the remote call reject with the `HttpError` Kit's client throws for `status`. */
function rejectWith(status: number, message: string) {
  remote.getTravelTimes.mockImplementationOnce(async () => error(status, message));
}

describe('lookUpTravelTimes', () => {
  test('returns the destinations', async () => {
    remote.getTravelTimes.mockResolvedValueOnce([]);

    expect(await lookUpTravelTimes('1 Main St')).toEqual([]);
  });

  describe('when the server rejects the address', () => {
    test("throws the server's message", async () => {
      rejectWith(400, 'Google could not find that address.');

      await expect(lookUpTravelTimes('1 Main St')).rejects.toThrow(
        'Google could not find that address.',
      );
    });
  });

  describe('when the session has expired', () => {
    test('sends the user to the login page, to return here', async () => {
      vi.stubGlobal('location', new URL('https://example.com/?address=1+Main+St'));
      rejectWith(401, 'Unauthorized');

      await expect(lookUpTravelTimes('1 Main St')).rejects.toThrow('Your session has expired.');
      expect(navigation.goto).toHaveBeenCalledExactlyOnceWith(
        '/login?redirectTo=%2F%3Faddress%3D1%2BMain%2BSt',
      );
    });
  });

  describe('when the server fails', () => {
    test("throws Kit's message", async () => {
      rejectWith(500, 'Internal Error');

      await expect(lookUpTravelTimes('1 Main St')).rejects.toThrow('Internal Error');
    });
  });

  describe('when the request never arrives', () => {
    test('rethrows the error', async () => {
      const offline = new TypeError('Failed to fetch');
      remote.getTravelTimes.mockRejectedValueOnce(offline);

      await expect(lookUpTravelTimes('1 Main St')).rejects.toBe(offline);
    });
  });
});
