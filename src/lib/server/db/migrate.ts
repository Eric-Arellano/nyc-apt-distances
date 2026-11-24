import type { Kysely } from 'kysely';
import { type Migration, Migrator } from 'kysely/migration';
import { MIGRATIONS } from './migrations/index.ts';

// Postgres can roll back DDL, so Kysely runs every pending migration in one transaction: a failure
// leaves the schema as it was.
export async function migrateToLatest<DB>(
  db: Kysely<DB>,
  migrations: Record<string, Migration> = MIGRATIONS,
): Promise<string[]> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const { error, results = [] } = await migrator.migrateToLatest();
  if (error) {
    const failed = results.find((result) => result.status === 'Error');
    throw new Error(`Migration ${failed?.migrationName ?? '(none)'} failed`, { cause: error });
  }
  return results.map((result) => result.migrationName);
}
