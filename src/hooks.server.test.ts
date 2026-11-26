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

/**
 * Runs a request to `path` through `handle`. `routeId` is what SvelteKit's router matched, or null
 * when nothing did.
 */
async function request(path: string, routeId: string | null, session?: string) {
  return run({ path, routeId, session, isRemoteRequest: false });
}

/** Runs a remote function call through `handle`, claiming to come from the page `routeId`. */
async function remoteCall(routeId: string | null, session?: string) {
  return run({
    path: '/_app/remote/abc123/getTravelTimes',
    routeId,
    session,
    isRemoteRequest: true,
  });
}

async function run({
  path,
  routeId,
  session,
  isRemoteRequest,
}: {
  path: string;
  routeId: string | null;
  session: string | undefined;
  isRemoteRequest: boolean;
}) {
  const resolve = vi.fn(async () => new Response('resolved'));
  const event = {
    url: new URL(path, 'https://example.com'),
    route: { id: routeId },
    cookies: { get: () => session } as unknown as Cookies,
    isRemoteRequest,
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
      ['the home page', '/'],
      // A `form` or `command` call names its page in a header the client controls.
      ['the login page', '/login'],
      ['no page', null],
    ])('refuses a remote call from %s with a 401', async (_, routeId) => {
      const { resolve, status } = await remoteCall(routeId);

      expect(status).toBe(401);
      expect(resolve).not.toHaveBeenCalled();
    });

    test.each([
      ['/', '/', '/login'],
      ['/?address=1+Main+St', '/', '/login?redirectTo=%2F%3Faddress%3D1%2BMain%2BSt'],
      ['/apartments/1', '/apartments/[id=apartmentId]', '/login?redirectTo=%2Fapartments%2F1'],
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
    const { resolve, status } = await remoteCall('/', '9999999999.forged');

    expect(status).toBe(401);
    expect(resolve).not.toHaveBeenCalled();
  });

  describe('with a live session', () => {
    function session() {
      return signSession(KEY, Math.floor(Date.now() / 1000) + 60);
    }

    test('allows a page', async () => {
      const { resolve, status } = await request('/', '/', session());

      expect(status).toBe(200);
      expect(resolve).toHaveBeenCalledOnce();
    });

    test('allows a remote call', async () => {
      const { resolve, status } = await remoteCall('/', session());

      expect(status).toBe(200);
      expect(resolve).toHaveBeenCalledOnce();
    });
  });
});
