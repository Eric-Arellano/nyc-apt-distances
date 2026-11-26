import { error } from '@sveltejs/kit';
import { describe, expect, test, vi } from 'vitest';
import { awaitRemote } from './awaitRemote';

const navigation = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => navigation);

/** A call that rejects with the `HttpError` SvelteKit's client throws for `status`. */
async function failingWith(status: number, message: string): Promise<never> {
  error(status, message);
}

describe('awaitRemote', () => {
  test("returns the call's value", async () => {
    expect(await awaitRemote(Promise.resolve([]))).toEqual([]);
  });

  describe('when the server rejects the input', () => {
    test("throws the server's message", async () => {
      await expect(
        awaitRemote(failingWith(400, 'Google could not find that address.')),
      ).rejects.toThrow('Google could not find that address.');
    });
  });

  describe('when the session has expired', () => {
    test('sends the user to the login page, to return here', async () => {
      vi.stubGlobal('location', new URL('https://example.com/?address=1+Main+St'));

      await expect(awaitRemote(failingWith(401, 'Unauthorized'))).rejects.toThrow(
        'Your session has expired.',
      );
      expect(navigation.goto).toHaveBeenCalledExactlyOnceWith(
        '/login?redirectTo=%2F%3Faddress%3D1%2BMain%2BSt',
      );
    });
  });

  describe('when the server fails', () => {
    test("throws SvelteKit's message", async () => {
      await expect(awaitRemote(failingWith(500, 'Internal Error'))).rejects.toThrow(
        'Internal Error',
      );
    });
  });

  describe('when the request never arrives', () => {
    test('rethrows the error', async () => {
      const offline = new TypeError('Failed to fetch');

      await expect(awaitRemote(Promise.reject(offline))).rejects.toBe(offline);
    });
  });
});
