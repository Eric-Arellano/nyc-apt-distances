import { error } from '@sveltejs/kit';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { signInOnExpiredSession } from './signInOnExpiredSession';

const navigation = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => navigation);

beforeEach(() => {
  navigation.goto.mockClear();
});

/** A submission that rejects with the `HttpError` SvelteKit's client throws for `status`. */
function failingWith(status: number, message: string) {
  return async (): Promise<boolean> => error(status, message);
}

describe('signInOnExpiredSession', () => {
  test('submits', async () => {
    const submit = vi.fn(async () => true);

    await signInOnExpiredSession({ submit });

    expect(submit).toHaveBeenCalledOnce();
    expect(navigation.goto).not.toHaveBeenCalled();
  });

  describe('when the session has expired', () => {
    test('sends the user to the login page, to return here', async () => {
      vi.stubGlobal('location', new URL('https://example.com/apartments/1'));

      await signInOnExpiredSession({ submit: failingWith(401, 'Unauthorized') });

      expect(navigation.goto).toHaveBeenCalledExactlyOnceWith(
        '/login?redirectTo=%2Fapartments%2F1',
      );
    });
  });

  describe('when the server fails', () => {
    test('rethrows, for the error page', async () => {
      await expect(
        signInOnExpiredSession({ submit: failingWith(500, 'Internal Error') }),
      ).rejects.toEqual({
        status: 500,
        body: { message: 'Internal Error', status: 500 },
      });
      expect(navigation.goto).not.toHaveBeenCalled();
    });
  });
});
