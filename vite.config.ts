import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter(),
      csp: {
        directives: {
          'script-src': ['self'],
          'style-src': ['self'],
          'img-src': ['self'],
          'connect-src': ['self'],
          'frame-ancestors': ['none'],
          'form-action': ['self'],
          'base-uri': ['self'],
          'object-src': ['none'],
        },
      },
    }),
    // Resolves Svelte's browser build under Vitest and unmounts components after each test.
    svelteTesting(),
  ],
  test: {
    expect: { requireAssertions: true },
    // Only print logs for tests that fail.
    silent: 'passed-only',
    // Component tests opt into jsdom with a `@vitest-environment jsdom` comment.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Undoes every `vi.stubGlobal` after each test, so one test's `fetch` mock can't leak.
    unstubGlobals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
