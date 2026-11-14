/**
 * The site password is all that stands between the internet and the billed Google key.
 *
 * The session is a cookie holding an expiry and an HMAC of it, keyed by the password: nothing is
 * stored, and changing the password signs every browser out.
 */

import { createHash, createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { SITE_PASSWORD } from '$app/env/private';

export const SESSION_COOKIE_NAME = 'site-session';
export const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

export function isSitePassword(candidate: string): boolean {
  // Digests, so `timingSafeEqual` gets equal lengths.
  return timingSafeEqual(sha256(candidate), sha256(SITE_PASSWORD));
}

// A cookie is an HMAC of a known message, so whoever holds one can test password guesses against
// it offline. scrypt makes each guess cost tens of milliseconds rather than nanoseconds. The salt
// can be fixed: it only has to rule out precomputed tables, and there is one password.
export function deriveSessionKey(password: string): Buffer {
  return scryptSync(password, 'apt-distances site session', 32);
}

export function signSession(key: Buffer, expiresAt: number): string {
  const signature = createHmac('sha256', key).update(`${expiresAt}`).digest('base64url');
  return `${expiresAt}.${signature}`;
}

export function isLiveSession(key: Buffer, session: string, now: number): boolean {
  const expiresAt = Number(session.split('.')[0]);
  // Re-signing the expiry it claims means a malformed value simply fails to match.
  const expected = Buffer.from(signSession(key, expiresAt));
  const given = Buffer.from(session);
  return given.length === expected.length && timingSafeEqual(given, expected) && expiresAt > now;
}

export function hasSession(cookies: Cookies): boolean {
  const session = cookies.get(SESSION_COOKIE_NAME);
  return session !== undefined && isLiveSession(siteSessionKey(), session, nowSeconds());
}

export function startSession(cookies: Cookies): void {
  // `httpOnly`, `secure` and `sameSite` are left to SvelteKit's defaults.
  cookies.set(
    SESSION_COOKIE_NAME,
    signSession(siteSessionKey(), nowSeconds() + SESSION_LIFETIME_SECONDS),
    {
      path: '/',
      maxAge: SESSION_LIFETIME_SECONDS,
    },
  );
}

// Derived once per server instance, since every request checks a session.
let sessionKey: Buffer | undefined;
function siteSessionKey(): Buffer {
  sessionKey ??= deriveSessionKey(SITE_PASSWORD);
  return sessionKey;
}

function sha256(text: string): Buffer {
  return createHash('sha256').update(text).digest();
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
