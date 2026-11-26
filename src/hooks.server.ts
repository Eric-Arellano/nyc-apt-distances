import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { loginPath } from '#lib/loginRedirect.ts';
import { hasSession } from '#lib/server/auth.ts';

/**
 * The route ids reachable without the site password. Everything else is gated, so a route added
 * later is private by default. Every remote function call spends the Google key, and stored
 * apartments, agent contacts included, are private. Matching the route id rather than the pathname
 * means what is open is a route file, not a spelling of a URL.
 */
const OPEN_ROUTES = new Set(['/login']);

export const handle: Handle = async ({ event, resolve }) => {
  if (hasSession(event.cookies)) return resolve(event);

  // Kit sets a `form` or `command` call's route id from the `x-sveltekit-pathname` header the
  // client sends, so a forged header could name `/login`. No remote call is open, whatever route
  // it claims. A 401 rather than a redirect, since a `query` call's URL is its endpoint, not the
  // page to return to.
  if (event.isRemoteRequest) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (OPEN_ROUTES.has(event.route.id ?? '')) return resolve(event);

  // Thrown rather than returned, so SvelteKit answers data and form-action requests in the shape
  // their client expects.
  redirect(303, loginPath(event.url));
};
