import type { Kysely } from 'kysely';
import { type Migration, Migrator } from 'kysely/migration';
import { MIGRATIONS } from './migrations/index.ts';

/**
 * Applies every pending migration and returns their names. Postgres can roll back DDL, so Kysely
 * runs them in one transaction: a failure leaves the schema as it was.
 */
export async function migrateToLatest<DB>(
  db: Kysely<DB>,
  migrations: Record<string, Migration> = MIGRATIONS,
): Promise<string[]> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const { error, results = [] } = await migrator.migrateToLatest();
  if (error) {
    // No result has failed when the error came before any migration ran, such as a lost
    // connection or a landed migration missing from `MIGRATIONS`.
    const failed = results.find((result) => result.status === 'Error');
    const message = failed ? `Migration ${failed.migrationName} failed` : 'Could not migrate';
    throw new Error(message, { cause: error });
  }
  return results.map((result) => result.migrationName);
}
