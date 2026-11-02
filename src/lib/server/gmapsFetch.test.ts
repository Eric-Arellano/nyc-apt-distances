import { setTimeout as sleep } from 'node:timers/promises';
import { describe, expect, test, vi } from 'vitest';
import { fetchGoogle } from './gmapsFetch';

vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn(async () => undefined) }));

const ENDPOINT = 'https://example.com/';

function stubFetch(...outcomes: (number | Error)[]) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response());
  for (const outcome of outcomes) {
    fetchMock.mockImplementationOnce(async () => {
      if (outcome instanceof Error) throw outcome;
      return new Response(null, { status: outcome });
    });
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchGoogle', () => {
  test('passes the request through with a timeout', async () => {
    const fetchMock = stubFetch(200);

    await fetchGoogle(ENDPOINT, { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(ENDPOINT, {
      method: 'POST',
      signal: expect.any(AbortSignal),
    });
  });

  test('returns a client error without retrying', async () => {
    const fetchMock = stubFetch(403);

    expect((await fetchGoogle(ENDPOINT)).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test.each([429, 500, 503])('retries a %i', async (status) => {
    const fetchMock = stubFetch(status, 200);

    expect((await fetchGoogle(ENDPOINT)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('retries a network error', async () => {
    stubFetch(new TypeError('fetch failed'), 200);

    expect((await fetchGoogle(ENDPOINT)).status).toBe(200);
  });

  test('backs off between attempts', async () => {
    vi.mocked(sleep).mockClear();
    stubFetch(503, 503, 503, 200);

    await fetchGoogle(ENDPOINT);

    expect(vi.mocked(sleep).mock.calls).toEqual([[100], [300], [900]]);
  });

  describe('when every attempt fails', () => {
    test('returns the last response', async () => {
      const fetchMock = stubFetch(503, 503, 503, 502);

      expect((await fetchGoogle(ENDPOINT)).status).toBe(502);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    test('throws the last network error', async () => {
      stubFetch(...Array.from({ length: 4 }, (_, i) => new TypeError(`failure ${i}`)));

      await expect(fetchGoogle(ENDPOINT)).rejects.toThrow('failure 3');
    });
  });
});
