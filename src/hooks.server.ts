import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { loginPath } from '#lib/loginRedirect.ts';
import { hasSession } from '#lib/server/auth.ts';

// Everything is gated except the login page, so a route added later is private by default. Every
// request to `/api/` spends the Google key, and stored apartments, agent contacts included, are
// private. Matching the route id rather than the pathname means what is open is a route file, not
// a spelling of a URL.
const OPEN_ROUTES = new Set(['/login']);

export const handle: Handle = async ({ event, resolve }) => {
  if (OPEN_ROUTES.has(event.route.id ?? '') || hasSession(event.cookies)) {
    return resolve(event);
  }

  // The pathname only picks how to refuse, so a URL that matched no route still gets a 401.
  if (event.url.pathname.startsWith('/api/')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Thrown rather than returned, so SvelteKit answers data and form-action requests in the shape
  // their client expects.
  redirect(303, loginPath(event.url));
};
