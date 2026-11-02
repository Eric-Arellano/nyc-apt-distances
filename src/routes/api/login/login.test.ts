import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { describe, expect, test, vi } from 'vitest';
import { SESSION_COOKIE_NAME } from '#lib/server/auth.ts';
import { POST } from './+server';

vi.mock('#lib/server/env.ts', () => ({ SITE_PASSWORD: 'correct-horse-battery' }));

async function postLogin(body: string) {
  const cookies = { set: vi.fn() };
  const request = new Request('https://example.com/api/login', { method: 'POST', body });
  const response = await POST({ cookies, request } as unknown as RequestEvent);
  return { cookies: cookies as typeof cookies & Cookies, status: response.status };
}

describe('POST', () => {
  test('starts a session for the site password', async () => {
    const { cookies, status } = await postLogin('{"password":"correct-horse-battery"}');

    expect(status).toBe(204);
    expect(cookies.set).toHaveBeenCalledExactlyOnceWith(
      SESSION_COOKIE_NAME,
      expect.any(String),
      expect.any(Object),
    );
  });

  test.each([
    ['the wrong password', '{"password":"guess"}', 401],
    ['no password', '{}', 400],
    ['a non-string password', '{"password":1}', 400],
    ['invalid JSON', 'not json', 400],
  ])('refuses %s', async (_, body, expected) => {
    const { cookies, status } = await postLogin(body);

    expect(status).toBe(expected);
    expect(cookies.set).not.toHaveBeenCalled();
  });
});
