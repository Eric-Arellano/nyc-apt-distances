import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { describe, expect, test, vi } from 'vitest';
import { signSession } from '#lib/server/auth.ts';
import { handle } from './hooks.server';

const PASSWORD = 'correct-horse-battery';

vi.mock('$app/env/private', () => ({ SITE_PASSWORD: 'correct-horse-battery' }));

async function request(path: string, session?: string) {
  const resolve = vi.fn(async () => new Response('resolved'));
  const event = {
    url: new URL(path, 'https://example.com'),
    cookies: { get: () => session } as unknown as Cookies,
  } as RequestEvent;
  const response = await handle({ event, resolve });
  return { resolve, response, status: response.status };
}

describe('handle', () => {
  describe('without a session', () => {
    test.each(['/api/travel-times', '/api/logins'])('refuses %s with a 401', async (path) => {
      const { resolve, status } = await request(path);

      expect(status).toBe(401);
      expect(resolve).not.toHaveBeenCalled();
    });

    test.each(['/', '/apartments/1', '/loginx'])('sends %s to the login page', async (path) => {
      const { resolve, response } = await request(path);

      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe('/login');
      expect(resolve).not.toHaveBeenCalled();
    });

    test.each(['/login', '/api/login'])('leaves %s open', async (path) => {
      const { resolve, status } = await request(path);

      expect(status).toBe(200);
      expect(resolve).toHaveBeenCalledOnce();
    });
  });

  test('refuses a forged session', async () => {
    const { resolve, status } = await request('/api/travel-times', '9999999999.forged');

    expect(status).toBe(401);
    expect(resolve).not.toHaveBeenCalled();
  });

  test.each(['/', '/api/travel-times'])('allows %s with a live session', async (path) => {
    const session = signSession(PASSWORD, Math.floor(Date.now() / 1000) + 60);

    const { resolve, status } = await request(path, session);

    expect(status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
  });
});
