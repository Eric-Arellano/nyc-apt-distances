import { Kysely, PGliteDialect, PostgresDialect } from 'kysely';
import pg from 'pg';
import type Database from './schema/Database.ts';

export type DatabaseTarget =
  | { kind: 'postgres'; url: string }
  // Without a directory, PGlite keeps the database in memory.
  | { kind: 'pglite'; dataDir?: string };

// The one place that knows which driver an environment uses: Neon through `pg`, and PGlite for dev
// and tests.
export function createDatabase(target: DatabaseTarget): Kysely<Database> {
  switch (target.kind) {
    case 'postgres':
      return new Kysely({
        dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: target.url }) }),
      });
    case 'pglite':
      return new Kysely({
        dialect: new PGliteDialect({
          // Imported lazily so production, which never takes this branch, never loads PGlite.
          pglite: async () => {
            const { PGlite } = await import('@electric-sql/pglite');
            return new PGlite(target.dataDir);
          },
        }),
      });
  }
}
