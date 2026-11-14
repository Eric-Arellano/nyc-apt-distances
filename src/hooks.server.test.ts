import { type Cookies, isRedirect, type RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { deriveSessionKey, signSession } from '#lib/server/auth.ts';
import { handle } from './hooks.server';

const KEY = deriveSessionKey('correct-horse-battery');

vi.mock('$app/env/private', () => ({ SITE_PASSWORD: 'correct-horse-battery' }));

// Under Vitest, `svelteTesting()` resolves SvelteKit's browser build, whose `redirect` reads the
// origin from `window` rather than from the request.
beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'https://example.com' } });
});

// `routeId` is what SvelteKit's router matched, or null when nothing did.
async function request(path: string, routeId: string | null, session?: string) {
  const resolve = vi.fn(async () => new Response('resolved'));
  const event = {
    url: new URL(path, 'https://example.com'),
    route: { id: routeId },
    cookies: { get: () => session } as unknown as Cookies,
  } as RequestEvent;
  try {
    const response = await handle({ event, resolve });
    return { resolve, status: response.status, location: response.headers.get('location') };
  } catch (thrown) {
    if (!isRedirect(thrown)) throw thrown;
    return { resolve, status: thrown.status, location: thrown.location };
  }
}

describe('handle', () => {
  describe('without a session', () => {
    test.each([
      ['/api/travel-times', '/api/travel-times'],
      ['/api/nothing', null],
    ])('refuses %s with a 401', async (path, routeId) => {
      const { resolve, status } = await request(path, routeId);

      expect(status).toBe(401);
      expect(resolve).not.toHaveBeenCalled();
    });

    test.each([
      ['/', '/', '/login'],
      ['/?address=1+Main+St', '/', '/login?redirectTo=%2F%3Faddress%3D1%2BMain%2BSt'],
      ['/loginx', null, '/login?redirectTo=%2Floginx'],
      // An encoded spelling of `/login` that matched no route stays gated.
      ['/%6Cogin', null, '/login?redirectTo=%2F%256Cogin'],
    ])('sends %s to the login page', async (path, routeId, expected) => {
      const { location, resolve, status } = await request(path, routeId);

      expect({ status, location }).toEqual({ status: 303, location: expected });
      expect(resolve).not.toHaveBeenCalled();
    });

    test('leaves the login page open', async () => {
      const { resolve, status } = await request('/login?redirectTo=%2F', '/login');

      expect(status).toBe(200);
      expect(resolve).toHaveBeenCalledOnce();
    });
  });

  test('refuses a forged session', async () => {
    const { resolve, status } = await request(
      '/api/travel-times',
      '/api/travel-times',
      '9999999999.forged',
    );

    expect(status).toBe(401);
    expect(resolve).not.toHaveBeenCalled();
  });

  test.each(['/', '/api/travel-times'])('allows %s with a live session', async (path) => {
    const session = signSession(KEY, Math.floor(Date.now() / 1000) + 60);

    const { resolve, status } = await request(path, path, session);

    expect(status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
  });
});
