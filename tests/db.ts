import type { Kysely } from 'kysely';
import { createDatabase } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';
import type Database from '#lib/server/db/schema/Database.ts';

/**
 * A fresh, migrated database in memory. Create one per test file and `destroy()` it in `afterAll`.
 */
export async function createTestDatabase(): Promise<Kysely<Database>> {
  const db = createDatabase({ kind: 'pglite' });
  await migrateToLatest(db);
  return db;
}
