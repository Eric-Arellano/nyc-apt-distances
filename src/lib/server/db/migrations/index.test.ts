import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { MIGRATIONS } from './index.ts';

const files = readdirSync(import.meta.dirname)
  .filter((file) => !file.startsWith('index.'))
  .map((file) => file.replace(/\.ts$/, ''));

describe('MIGRATIONS', () => {
  test('lists every migration file', () => {
    expect(Object.keys(MIGRATIONS).toSorted()).toEqual(files.toSorted());
  });

  // Kysely runs migrations in key order, so the numbers must sort as strings.
  test('names each one with a three-digit number', () => {
    for (const name of Object.keys(MIGRATIONS)) {
      expect(name).toMatch(/^\d{3}-[a-z0-9-]+$/);
    }
  });
});
