import { isHttpError } from '@sveltejs/kit';
import { loginPath } from '#lib/loginRedirect.ts';
import { goto } from '$app/navigation';

/**
 * The `enhance` callback for every remote form. Unlike SvelteKit's default, it never resets the
 * form, so what was typed survives a result or an issue. An expired session goes to the login page
 * rather than the error page.
 */
export async function signInOnExpiredSession({
  submit,
}: {
  submit(): Promise<boolean>;
}): Promise<void> {
  try {
    await submit();
  } catch (thrown) {
    // Every page is gated, so a 401 means the session expired after the page loaded.
    if (!isHttpError(thrown, 401)) throw thrown;
    await goto(loginPath(new URL(location.href)));
  }
}
