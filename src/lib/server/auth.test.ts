import type { Cookies } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  deriveSessionKey,
  hasSession,
  isLiveSession,
  isSitePassword,
  SESSION_COOKIE_NAME,
  SESSION_LIFETIME_SECONDS,
  signSession,
  startSession,
} from './auth';

const PASSWORD = 'correct-horse-battery';
const KEY = deriveSessionKey(PASSWORD);
const NOW = 1_800_000_000;

vi.mock('$app/env/private', () => ({ SITE_PASSWORD: 'correct-horse-battery' }));

beforeEach(() => {
  vi.useFakeTimers({ now: NOW * 1000 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isSitePassword', () => {
  test.each([
    ['the password', PASSWORD, true],
    ['another password', 'correct-horse-staple', false],
    ['a prefix of it', 'correct-horse', false],
    ['nothing', '', false],
  ])('%s is %s', (_, candidate, expected) => {
    expect(isSitePassword(candidate)).toBe(expected);
  });
});

describe('isLiveSession', () => {
  test('accepts an unexpired session the password signed', () => {
    expect(isLiveSession(KEY, signSession(KEY, NOW + 60), NOW)).toBe(true);
  });

  test('refuses an expired session', () => {
    expect(isLiveSession(KEY, signSession(KEY, NOW), NOW)).toBe(false);
  });

  test('refuses a session signed with another password', () => {
    expect(
      isLiveSession(KEY, signSession(deriveSessionKey('the-previous-one'), NOW + 60), NOW),
    ).toBe(false);
  });

  test('refuses an expiry moved without re-signing', () => {
    const signature = signSession(KEY, NOW - 60).split('.')[1];

    expect(isLiveSession(KEY, `${NOW + 60}.${signature}`, NOW)).toBe(false);
  });

  test('refuses a valid session with anything appended', () => {
    expect(isLiveSession(KEY, `${signSession(KEY, NOW + 60)}.extra`, NOW)).toBe(false);
  });

  test.each(['', 'garbage', `${NOW + 60}`, `${NOW + 60}.`, `.${NOW}`, '1e12.abc', 'a.b.c'])(
    'refuses the malformed %j',
    (session) => {
      expect(isLiveSession(KEY, session, NOW)).toBe(false);
    },
  );
});

function aJar(cookie?: string) {
  return { get: vi.fn(() => cookie), set: vi.fn() };
}

describe('startSession', () => {
  test('writes a session that lasts the full lifetime', () => {
    const jar = aJar();

    startSession(jar as unknown as Cookies);

    expect(jar.set.mock.calls).toEqual([
      [
        SESSION_COOKIE_NAME,
        signSession(KEY, NOW + SESSION_LIFETIME_SECONDS),
        { path: '/', maxAge: SESSION_LIFETIME_SECONDS },
      ],
    ]);
  });
});

describe('hasSession', () => {
  test('is false without the cookie', () => {
    expect(hasSession(aJar() as unknown as Cookies)).toBe(false);
  });

  test('is true for a live session in the cookie', () => {
    const jar = aJar(signSession(KEY, NOW + 60));

    expect(hasSession(jar as unknown as Cookies)).toBe(true);
    expect(jar.get).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  test('is false for an expired session in the cookie', () => {
    expect(hasSession(aJar(signSession(KEY, NOW)) as unknown as Cookies)).toBe(false);
  });

  test('is false for a session keyed by the raw password', () => {
    const jar = aJar(signSession(Buffer.from(PASSWORD), NOW + 60));

    expect(hasSession(jar as unknown as Cookies)).toBe(false);
  });
});
