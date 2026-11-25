import { type ActionFailure, fail, isHttpError } from '@sveltejs/kit';

/**
 * Turns an error from computing travel times into a failure the form shows in place, keeping
 * `data`, rather than the error page. Other HTTP errors, such as a 404, are rethrown.
 */
export function lookupFailure<T extends object>(
  error: unknown,
  data: T,
): ActionFailure<T & { message: string }> {
  // Geocoding's 400s are written for the user.
  if (isHttpError(error, 400)) return fail(400, { ...data, message: error.body.message });
  if (isHttpError(error)) throw error;

  console.error('Computing travel times failed:', error);
  return fail(502, { ...data, message: 'Couldn’t compute travel times. Try again in a minute.' });
}
