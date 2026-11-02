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
  return { resolve, status: response.status };
}

describe('handle', () => {
  test('refuses an API route without a session', async () => {
    const { resolve, status } = await request('/api/travel-times');

    expect(status).toBe(401);
    expect(resolve).not.toHaveBeenCalled();
  });

  test('refuses an API route with a forged session', async () => {
    const { resolve, status } = await request('/api/travel-times', '9999999999.forged');

    expect(status).toBe(401);
    expect(resolve).not.toHaveBeenCalled();
  });

  test('allows an API route with a live session', async () => {
    const session = signSession(PASSWORD, Math.floor(Date.now() / 1000) + 60);

    const { resolve, status } = await request('/api/travel-times', session);

    expect(status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
  });

  test.each(['/', '/api/login'])('leaves %s open', async (path) => {
    const { resolve, status } = await request(path);

    expect(status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
  });
});
