import type { Kysely } from 'kysely';
import { createDatabase, type DatabaseTarget } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';
import type Database from '#lib/server/db/schema/Database.ts';
import { dev } from '$app/env';
import { DATABASE_URL } from '$app/env/private';

// Each worktree gets its own dev database, since this is relative to where `vite dev` runs.
export const DEV_DATA_DIR = '.pglite';

export function databaseTarget(url: string | undefined, isDev: boolean): DatabaseTarget {
  if (url) return { kind: 'postgres', url };
  if (isDev) return { kind: 'pglite', dataDir: DEV_DATA_DIR };
  throw new Error('DATABASE_URL must be set outside `vite dev`.');
}

// Kept on `globalThis` because a hot reload re-runs this module, and a second PGlite opening the
// same directory would corrupt it.
const cache = globalThis as typeof globalThis & { aptDatabase?: Promise<Kysely<Database>> };

export function getDatabase(): Promise<Kysely<Database>> {
  cache.aptDatabase ??= openDatabase(databaseTarget(DATABASE_URL, dev));
  return cache.aptDatabase;
}

async function openDatabase(target: DatabaseTarget): Promise<Kysely<Database>> {
  const db = createDatabase(target);
  // Neon is migrated by Vercel's build step. The dev database has no build step, so it catches up
  // on first use.
  if (target.kind === 'pglite') await migrateToLatest(db);
  return db;
}
