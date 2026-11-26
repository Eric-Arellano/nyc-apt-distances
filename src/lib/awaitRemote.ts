import { isHttpError } from '@sveltejs/kit';
import { loginPath } from '#lib/loginRedirect.ts';
import { goto } from '$app/navigation';

/** Awaits a remote function call in the browser, turning SvelteKit's `HttpError` into `Error`. */
export async function awaitRemote<T>(call: PromiseLike<T>): Promise<T> {
  try {
    return await call;
  } catch (thrown) {
    if (!isHttpError(thrown)) throw thrown;

    // Every page is gated, so a 401 means the session expired after the page loaded.
    if (thrown.status === 401) {
      await goto(loginPath(new URL(location.href)));
      throw new Error('Your session has expired.');
    }
    // An `HttpError` has no `message` of its own, and an `error(400, …)` body is for the user.
    throw new Error(thrown.body.message);
  }
}
