// Runs pending migrations against Neon. vercel.json runs it before every Vercel build, so each
// preview migrates its own Neon branch and production migrates the main branch. The dev database
// needs no command: `npm run dev` migrates it on first use.
import { createDatabase } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';

// Run from a checkout, this would apply that branch's unmerged migrations to whatever DATABASE_URL
// names, which may be production's. Vercel sets VERCEL in its builds.
if (!process.env.VERCEL) throw new Error('scripts/migrate.ts runs only in a Vercel build.');

/**
 * The connection to migrate through, preferring the direct one: Neon's pooler is PgBouncer, meant
 * for the app's short queries.
 */
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL must be set.');

/**
 * The database host, logged so the build log shows which Neon branch a deployment migrated. Never
 * log the whole URL: it holds the password. Node's invalid-URL error carries its input, so refuse a
 * malformed URL here rather than let `pg` throw that error into the build log.
 */
const host = URL.parse(url)?.host;
if (!host) throw new Error('The database URL does not parse.');
console.log(`Migrating ${host}`);
const db = createDatabase({ kind: 'postgres', url });
try {
  const ran = await migrateToLatest(db);
  console.log(ran.length ? `Ran ${ran.join(', ')}` : 'Already up to date');
} finally {
  await db.destroy();
}
