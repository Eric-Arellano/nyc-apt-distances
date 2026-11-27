import { invalid, isHttpError } from '@sveltejs/kit';

// For a remote `form`'s handler: a failed lookup shows in place, keeping what was typed, rather
// than on the error page. Other HTTP errors, such as a 404, still go to the error page.
export async function showFailureInForm<T>(work: Promise<T>): Promise<T> {
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
