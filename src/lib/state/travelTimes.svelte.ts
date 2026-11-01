import type { TravelTimes, TravelTimesRequest } from '#lib/types.ts';
import authState from './auth.svelte';

const travelTimesRequest: TravelTimesRequest = $state({ task: null });

export async function getTravelTimes(streetAddress: string): Promise<TravelTimes> {
  const params = new URLSearchParams({ 'street-address': streetAddress });
  const res = await fetch(`/api/travel-times?${params}`, {
    headers: { Authorization: `Bearer ${authState.token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (res.ok) return res.json() as Promise<TravelTimes>;

  // The user should only have been able to submit the request if they were previously
  // determined by the client to be authenticated. So, receiving a 401 most likely means that
  // the JWT has expired.
  if (res.status === 401) {
    authState.isAuthenticated = false;
    throw new Error(`Your session has expired. Please login.`);
  }

  throw new Error(`Failed to fetch travel times: ${res.status} ${res.statusText}`);
}

export default travelTimesRequest;
