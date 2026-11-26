import { invalid, isHttpError } from '@sveltejs/kit';

/**
 * Awaits work that calls Google from a remote `form`, turning its failure into an issue the form
 * shows in place, keeping what was typed, rather than the error page. Other HTTP errors, such as a
 * 404, are rethrown.
 */
export async function orLookupIssue<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (thrown) {
    // Geocoding's 400s are written for the user.
    if (isHttpError(thrown, 400)) invalid(thrown.body.message);
    if (isHttpError(thrown)) throw thrown;

    console.error('Computing travel times failed:', thrown);
    invalid('Couldn’t compute travel times. Try again in a minute.');
  }
}
