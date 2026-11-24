import { describe, expect, test, vi } from 'vitest';
import { DEV_DATA_DIR, databaseTarget } from './database.ts';

vi.mock('$app/env/private', () => ({ DATABASE_URL: undefined }));

const URL = 'postgres://user:secret@example.neon.tech/neondb';

describe('databaseTarget', () => {
  test.each([
    ['dev', true],
    ['a build', false],
  ])('uses DATABASE_URL in %s', (_, isDev) => {
    expect(databaseTarget(URL, isDev)).toEqual({ kind: 'postgres', url: URL });
  });

  describe('without DATABASE_URL', () => {
    test('uses PGlite in dev', () => {
      expect(databaseTarget(undefined, true)).toEqual({ kind: 'pglite', dataDir: DEV_DATA_DIR });
    });

    test('throws outside dev', () => {
      expect(() => databaseTarget(undefined, false)).toThrow('DATABASE_URL must be set');
    });
  });
});
