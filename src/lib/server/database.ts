import type { Kysely } from 'kysely';
import { createDatabase, type DatabaseTarget } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';
import type Database from '#lib/server/db/schema/Database.ts';
import { dev } from '$app/env';
import { DATABASE_URL, DEV_USE_DATABASE_URL } from '$app/env/private';

// Each worktree gets its own dev database, since this is relative to where `vite dev` runs.
export const DEV_DATA_DIR = '.pglite';

// `vite dev` loads `.env.local`, where `vercel env pull` can write production's DATABASE_URL. So
// dev ignores DATABASE_URL unless DEV_USE_DATABASE_URL opts in, rather than quietly writing there.
export type Runtime = 'deployed' | 'dev' | 'dev-with-database-url';

export function databaseTarget(url: string | undefined, runtime: Runtime): DatabaseTarget {
  if (runtime === 'dev') return { kind: 'pglite', dataDir: DEV_DATA_DIR };
  if (url) return { kind: 'postgres', url };
  throw new Error(
    runtime === 'deployed'
      ? 'DATABASE_URL must be set outside `vite dev`.'
      : 'DEV_USE_DATABASE_URL is set, so DATABASE_URL must be too.',
  );
}

function currentRuntime(): Runtime {
  if (!dev) return 'deployed';
  return DEV_USE_DATABASE_URL ? 'dev-with-database-url' : 'dev';
}

// The connection is kept on `globalThis` because a hot reload re-runs this module, and a second
// PGlite opening the same directory would corrupt it.
const cache = globalThis as typeof globalThis & { aptDatabase?: Kysely<Database> };

// Module state, unlike the connection: editing a migration re-runs this module, so `vite dev`
// applies a new migration without a restart.
let ready: Promise<Kysely<Database>> | undefined;

export function getDatabase(): Promise<Kysely<Database>> {
  ready ??= prepareDatabase().catch((error: unknown) => {
    // Retry on the next request, so a fixed migration needs no restart either.
    ready = undefined;
    throw error;
  });
  return ready;
}

async function prepareDatabase(): Promise<Kysely<Database>> {
  const runtime = currentRuntime();
  const target = databaseTarget(DATABASE_URL, runtime);
  if (runtime === 'dev' && DATABASE_URL) {
    console.warn(
      '`vite dev` ignores DATABASE_URL and uses `.pglite/`; see the README to change it.',
    );
  }
  if (runtime === 'dev-with-database-url' && target.kind === 'postgres') {
    // Only the host: the URL holds the password.
    console.warn(`\`vite dev\` is using the database at ${URL.parse(target.url)?.host}.`);
  }
  cache.aptDatabase ??= createDatabase(target);
  // Neon is migrated by Vercel's build step. The dev database has no build step, so it catches up
  // on first use.
  if (target.kind === 'pglite') await migrateToLatest(cache.aptDatabase);
  return cache.aptDatabase;
}
