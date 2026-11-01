import type { Handle } from '@sveltejs/kit/hooks';
import { hasSession } from '#lib/server/auth.ts';

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/api/') || event.url.pathname.startsWith('/api/login')) {
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
