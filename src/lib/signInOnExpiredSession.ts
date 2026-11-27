import { isHttpError } from '@sveltejs/kit';
import { loginPath } from '#lib/loginRedirect.ts';
import { goto } from '$app/navigation';

// The `enhance` callback for every remote form, so an expired session lands on the login page
// rather than the error page. As with any `enhance` callback, the form is not reset, so what was
// typed survives a result or an issue.
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
