import { beforeEach, vi } from 'vitest';

// No test reaches the network. A test that needs `fetch` stubs its own over this one, and
// `unstubGlobals` in vite.config.ts puts this one back afterwards.
beforeEach(() => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    throw new Error(`fetch(${String(input)}) was called without a mock`);
  });
});

// Svelte's async mode makes `tick()` wait for a frame, and testing-library ticks after every test,
// but neither Node nor jsdom has `requestAnimationFrame`. `tick()` races it against a timeout, so
// any stand-in works.
globalThis.requestAnimationFrame ??= (callback) => Number(setTimeout(callback));
