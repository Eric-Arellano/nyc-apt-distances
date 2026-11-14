import type { Handle } from '@sveltejs/kit/hooks';
import { hasSession } from '#lib/server/auth.ts';

// Everything is gated except the login page and its endpoint, so a route added later is private
// by default. Every request to `/api/` spends the Google key, and stored apartments, agent
// contacts included, are private.
const OPEN_PATHS = new Set(['/login', '/api/login']);

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  // Exact match, so a future `/login-history` is still gated.
  if (OPEN_PATHS.has(pathname) || hasSession(event.cookies)) {
    return resolve(event);
  }

  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return new Response(null, { status: 303, headers: { location: '/login' } });
};
