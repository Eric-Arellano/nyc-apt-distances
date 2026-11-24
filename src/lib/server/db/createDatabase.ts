import { attachDatabasePool } from '@vercel/functions';
import { CamelCasePlugin, type Dialect, Kysely, PGliteDialect, PostgresDialect } from 'kysely';
import pg from 'pg';
import type Database from './schema/Database.ts';

export type DatabaseTarget =
  | { kind: 'postgres'; url: string }
  // Without a directory, PGlite keeps the database in memory. A `snapshot` is a `dumpDataDir()`
  // tarball to start from instead of running initdb.
  | { kind: 'pglite'; dataDir?: string; snapshot?: Blob };

export function createDatabase(target: DatabaseTarget): Kysely<Database> {
  return new Kysely({
    dialect: createDialect(target),
    // Without `maintainNestedObjectKeys`, it would also rename keys inside `jsonb` values, so a
    // snapshot would not read back as it was written.
    plugins: [new CamelCasePlugin({ maintainNestedObjectKeys: true })],
  });
}

// The one place that knows which driver an environment uses: Neon through `pg`, and PGlite for dev
// and tests.
function createDialect(target: DatabaseTarget): Dialect {
  switch (target.kind) {
    case 'postgres': {
      const pool = new pg.Pool({ connectionString: target.url });
      // Neon drops idle connections, such as when its compute scales to zero, and the pool emits
      // that as an `error` event that would crash the process without a listener. The pool
      // replaces the connection on the next query.
      pool.on('error', (error) => console.warn('Idle Postgres connection dropped:', error.message));
      // Keeps a Vercel function alive until its idle connections close, so a suspended instance
      // doesn't leak them. It does nothing outside a Vercel function, such as in the build step.
      attachDatabasePool(pool);
      return new PostgresDialect({ pool });
    }
    case 'pglite':
      return new PGliteDialect({
        // Imported lazily so production, which never takes this branch, never loads PGlite.
        pglite: async () => {
          const { PGlite } = await import('@electric-sql/pglite');
          return new PGlite({ dataDir: target.dataDir, loadDataDir: target.snapshot });
        },
      });
  }
}
