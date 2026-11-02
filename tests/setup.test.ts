import { describe, expect, test, vi } from 'vitest';

describe('fetch', () => {
  test('rejects when no mock is installed', async () => {
    await expect(fetch('https://routes.googleapis.com/')).rejects.toThrow(
      'fetch(https://routes.googleapis.com/) was called without a mock',
    );
  });

  test('uses a mock a test installs', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 404 }));
    expect((await fetch('https://routes.googleapis.com/')).status).toBe(404);
  });
});
