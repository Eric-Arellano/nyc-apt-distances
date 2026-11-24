import { describe, expect, test, vi } from 'vitest';
import { DEV_DATA_DIR, databaseTarget } from './database.ts';

vi.mock('$app/env/private', () => ({ DATABASE_URL: undefined }));

const NEON_URL = 'postgres://user:secret@example.neon.tech/neondb';

describe('databaseTarget', () => {
  describe('when deployed', () => {
    test('uses DATABASE_URL', () => {
      expect(databaseTarget(NEON_URL, 'deployed')).toEqual({ kind: 'postgres', url: NEON_URL });
    });

    test('throws without DATABASE_URL', () => {
      expect(() => databaseTarget(undefined, 'deployed')).toThrow('DATABASE_URL must be set');
    });
  });

  describe('in dev', () => {
    test.each([NEON_URL, undefined])('uses PGlite with DATABASE_URL %s', (url) => {
      expect(databaseTarget(url, 'dev')).toEqual({ kind: 'pglite', dataDir: DEV_DATA_DIR });
    });
  });
});
