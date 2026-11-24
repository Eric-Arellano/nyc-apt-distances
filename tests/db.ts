import { readFile } from 'node:fs/promises';
import type { Kysely } from 'kysely';
import { inject } from 'vitest';
import { createDatabase } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';
import type Database from '#lib/server/db/schema/Database.ts';

/**
 * A fresh, migrated database in memory. Create one per test file and `destroy()` it in `afterAll`.
 */
export async function createTestDatabase(): Promise<Kysely<Database>> {
  const db = await createEmptyTestDatabase();
  await migrateToLatest(db);
  return db;
}

// A fresh database with no migrations applied, started from the snapshot `globalSetup.ts` takes.
export async function createEmptyTestDatabase(): Promise<Kysely<Database>> {
  const snapshot = new Blob([await readFile(inject('pgliteSnapshotPath'))]);
  return createDatabase({ kind: 'pglite', snapshot });
}
