// Runs pending migrations against Neon. vercel.json runs it before every Vercel build, so each
// preview migrates its own Neon branch and production migrates the main branch.
//
//   npm run db:migrate
//
// The dev database needs no command: `npm run dev` migrates it on first use.
import { createDatabase } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';

// Prefer the direct connection: Neon's pooler is PgBouncer, meant for the app's short queries.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL must be set.');

// The host names the Neon branch, so the build log shows which database a deployment migrated.
// Never log the whole URL: it holds the password.
console.log(`Migrating ${new URL(url).host}`);
const db = createDatabase({ kind: 'postgres', url });
try {
  const ran = await migrateToLatest(db);
  console.log(ran.length ? `Ran ${ran.join(', ')}` : 'Already up to date');
} finally {
  await db.destroy();
}
