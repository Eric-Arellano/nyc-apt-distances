import { describe, expect, test } from 'vitest';
import { loginPath, returnPath } from './loginRedirect';

const ORIGIN = 'https://example.com';

describe('loginPath', () => {
  test('carries the path and query to return to', () => {
    expect(loginPath(new URL('/?address=1+Main+St', ORIGIN))).toBe(
      '/login?redirectTo=%2F%3Faddress%3D1%2BMain%2BSt',
    );
  });

  test('leaves the home page implicit', () => {
    expect(loginPath(new URL('/', ORIGIN))).toBe('/login');
  });
});

describe('returnPath', () => {
  test('follows a path on this site', () => {
    expect(returnPath('/apartments/1?tab=notes', ORIGIN)).toBe('/apartments/1?tab=notes');
  });

  test('follows a full URL on this site', () => {
    expect(returnPath(`${ORIGIN}/apartments/1`, ORIGIN)).toBe('/apartments/1');
  });

  test.each([
    null,
    '',
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example/',
    'javascript:alert(1)',
    'http://[',
  ])('goes home instead of to %j', (redirectTo) => {
    expect(returnPath(redirectTo, ORIGIN)).toBe('/');
  });
});
