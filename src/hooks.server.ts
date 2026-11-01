import type { Handle } from '@sveltejs/kit/hooks';
import { isValidSession } from '#lib/server/auth.ts';

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/api/') || event.url.pathname.startsWith('/api/login')) {
    return resolve(event);
  }

  const token = event.request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token || !isValidSession(token)) {
    return Response.json(
      { error: 'Unauthorized' },
      {
        status: 401,
      },
    );
  }
  return resolve(event);
};
