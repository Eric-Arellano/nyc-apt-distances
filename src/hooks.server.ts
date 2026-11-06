import type { Handle } from '@sveltejs/kit/hooks';
import { hasSession } from '#lib/server/auth.ts';

// Only `/api/` is gated, because each request there spends the Google key. A page is not: one
// whose `+page.server.ts` loads private data, such as stored apartment addresses, must call
// `hasSession` itself.
export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  // Exact match, so a future `/api/login-history` is still gated.
  if (!pathname.startsWith('/api/') || pathname === '/api/login') {
    return resolve(event);
  }

  if (!hasSession(event.cookies)) {
    return Response.json(
      { error: 'Unauthorized' },
      {
        status: 401,
      },
    );
  }
  return resolve(event);
};
