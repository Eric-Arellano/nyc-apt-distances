import { type Handle, json } from '@sveltejs/kit';
import { hasSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/api/') || event.url.pathname.startsWith('/api/login')) {
    return resolve(event);
  }

  if (!hasSession(event.cookies)) {
    return json(
      { error: 'Unauthorized' },
      {
        status: 401,
      },
    );
  }
  return resolve(event);
};
