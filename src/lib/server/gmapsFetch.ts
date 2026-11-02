import { setTimeout as sleep } from 'node:timers/promises';

const ATTEMPT_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [100, 300, 900];

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

// Retries are safe for POST too: computeRoutes is a read, despite its verb. The final response is
// returned as is, so callers handle a failure the same way whether or not it was retried.
export async function fetchGoogle(
  url: string | URL,
  init?: RequestInit,
  retryDelaysMs: readonly number[] = RETRY_DELAYS_MS,
): Promise<Response> {
  const [delayMs, ...laterDelaysMs] = retryDelaysMs;
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
    if (delayMs === undefined || !isTransient(response.status)) return response;
  } catch (error) {
    if (delayMs === undefined) throw error;
  }
  await sleep(delayMs);
  return fetchGoogle(url, init, laterDelaysMs);
}
