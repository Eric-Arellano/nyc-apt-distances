import { invalid, isHttpError } from '@sveltejs/kit';

/**
 * Awaits `work` in a remote `form`'s handler, showing a 400 from it as an issue on the form, which
 * keeps what was typed, rather than on the error page. Anything else still goes to the error page.
 */
export async function showBadRequestInForm<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (thrown) {
    // Geocoding rejects an address it can't place with a 400, whose message is for the user.
    if (isHttpError(thrown, 400)) invalid(thrown.body.message);
    throw thrown;
  }
}
