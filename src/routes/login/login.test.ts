import { type Cookies, fail, isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SESSION_COOKIE_NAME } from '#lib/server/auth.ts';
import { actions } from './+page.server';

vi.mock('$app/env/private', () => ({ SITE_PASSWORD: 'correct-horse-battery' }));

// Under Vitest, `svelteTesting()` resolves SvelteKit's browser build, whose `redirect` reads the
// origin from `window` rather than from the request.
beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'https://example.com' } });
});

async function submit(password: string | null, search = '') {
  const cookies = { set: vi.fn() };
  const body = new FormData();
  if (password !== null) body.set('password', password);
  const url = new URL(`/login${search}`, 'https://example.com');
  const request = new Request(url, { method: 'POST', body });
  try {
    const event = { cookies, request, url } as unknown as Parameters<typeof actions.default>[0];
    const result = await actions.default(event);
    return { cookies: cookies as typeof cookies & Cookies, result };
  } catch (thrown) {
    if (!isRedirect(thrown)) throw thrown;
    return { cookies, result: { redirect: thrown.location } };
  }
}

describe('actions.default', () => {
  describe('with the site password', () => {
    test('starts a session and returns to the requested page', async () => {
      const { cookies, result } = await submit(
        'correct-horse-battery',
        '?redirectTo=%2F%3Faddress%3D1%2BMain%2BSt',
      );

      expect(result).toEqual({ redirect: '/?address=1+Main+St' });
      expect(cookies.set).toHaveBeenCalledExactlyOnceWith(
        SESSION_COOKIE_NAME,
        expect.any(String),
        expect.any(Object),
      );
    });

    test('goes home rather than to another site', async () => {
      const { result } = await submit(
        'correct-horse-battery',
        '?redirectTo=https%3A%2F%2Fevil.example',
      );

      expect(result).toEqual({ redirect: '/' });
    });
  });

  test.each([
    ['the wrong password', 'guess', fail(401, { message: 'Invalid password' })],
    ['an empty password', '', fail(400, { message: 'Enter the password' })],
    ['no password', null, fail(400, { message: 'Enter the password' })],
  ])('refuses %s', async (_, password, expected) => {
    const { cookies, result } = await submit(password);

    expect(result).toEqual(expected);
    expect(cookies.set).not.toHaveBeenCalled();
  });
});
