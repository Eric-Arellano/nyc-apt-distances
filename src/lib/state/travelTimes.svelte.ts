import { loginPath } from '#lib/loginRedirect.ts';
import type { DestinationResult } from '#lib/types.ts';
import { goto } from '$app/navigation';

interface TravelTimesRequest {
  task: Promise<DestinationResult[]> | null;
}

const travelTimesRequest: TravelTimesRequest = $state({ task: null });

export async function getTravelTimes(streetAddress: string): Promise<DestinationResult[]> {
  const params = new URLSearchParams({ 'street-address': streetAddress });
  const res = await fetch(`/api/travel-times?${params}`, { signal: AbortSignal.timeout(30_000) });
  if (res.ok) return res.json() as Promise<DestinationResult[]>;

  // Every page is gated, so a 401 means the session expired after the page loaded.
  if (res.status === 401) {
    await goto(loginPath(new URL(location.href)));
    throw new Error('Your session has expired.');
  }

  // SvelteKit sends `error(400, message)` as JSON, and the message is written for the user.
  if (res.status === 400) {
    const { message } = await res.json();
    throw new Error(message);
  }

  throw new Error(`Failed to fetch travel times: ${res.status} ${res.statusText}`);
}

export default travelTimesRequest;
