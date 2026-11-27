import { isHttpError } from '@sveltejs/kit';
import { loginPath } from '#lib/loginRedirect.ts';
import { goto } from '$app/navigation';

interface Submittable {
  submit(): Promise<boolean>;
}

/** Resolves to whether the submission succeeded, sending an expired session to the login page. */
export async function submitOrSignIn({ submit }: Submittable): Promise<boolean> {
  try {
    return await submit();
  } catch (thrown) {
    // Every page is gated, so a 401 means the session expired after the page loaded.
    if (!isHttpError(thrown, 401)) throw thrown;
    await goto(loginPath(new URL(location.href)));
    return false;
  }
}

/**
 * The `enhance` callback for every remote form. Unlike SvelteKit's default, it never resets the
 * form, so what was typed survives a result or an issue.
 */
export async function signInOnExpiredSession(form: Submittable): Promise<void> {
  await submitOrSignIn(form);
}
