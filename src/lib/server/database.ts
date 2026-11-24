// The app's database. It lives outside `db/` because it reads SvelteKit's env, which the plain Node
// scripts in `scripts/` can't import.
import type { Kysely } from 'kysely';
import { createDatabase, type DatabaseTarget } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';
import type Database from '#lib/server/db/schema/Database.ts';
import { dev } from '$app/env';
import { DATABASE_URL } from '$app/env/private';

// Each worktree gets its own dev database, since this is relative to where `vite dev` runs.
export const DEV_DATA_DIR = '.pglite';

// `vite dev` always uses PGlite, even when `.env.local` holds the DATABASE_URL that `vercel env
// pull` writes there, so nothing run locally can write to Neon.
// *Rejected: an opt-in to develop against a Neon branch, because an agent could point it at
// production; previews already run against real Postgres.*
export function databaseTarget(
  url: string | undefined,
  runtime: 'deployed' | 'dev',
): DatabaseTarget {
  if (runtime === 'dev') return { kind: 'pglite', dataDir: DEV_DATA_DIR };
  if (url) return { kind: 'postgres', url };
  throw new Error('DATABASE_URL must be set outside `vite dev`.');
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
  const target = databaseTarget(DATABASE_URL, dev ? 'dev' : 'deployed');
  if (dev && DATABASE_URL) console.warn('`vite dev` ignores DATABASE_URL and uses `.pglite/`.');
  cache.aptDatabase ??= createDatabase(target);
  // Neon is migrated by Vercel's build step. The dev database has no build step, so it catches up
  // on first use.
  if (target.kind === 'pglite') await migrateToLatest(cache.aptDatabase);
  return cache.aptDatabase;
}
