import { isHttpError } from '@sveltejs/kit';
import { loginPath } from '#lib/loginRedirect.ts';
import type { DestinationResult } from '#lib/types.ts';
import { goto } from '$app/navigation';
import { getTravelTimes } from './travelTimes.remote';

export async function lookUpTravelTimes(address: string): Promise<DestinationResult[]> {
  try {
    return await getTravelTimes(address);
  } catch (thrown) {
    if (!isHttpError(thrown)) throw thrown;

    // Every page is gated, so a 401 means the session expired after the page loaded.
    if (thrown.status === 401) {
      await goto(loginPath(new URL(location.href)));
      throw new Error('Your session has expired.');
    }
    // An `HttpError` has no `message` of its own, and an `error(400, …)` body is written for the user.
    throw new Error(thrown.body.message);
  }
}
