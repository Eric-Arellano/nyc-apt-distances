// Regenerates the Kysely types in src/lib/server/db/schema from the migrations. It migrates a
// throwaway PGlite and has Kanel read that, so it needs no Postgres server and never sees data.
//
//   npm run db:types
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makePgTsGenerator, processDatabase } from 'kanel';
import { kyselyTypeFilter, makeKyselyHook } from 'kanel-kysely';
import { createDatabase } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';

// kanel-kysely ends Database.ts with `export default Database;` for a type alias, which
// `verbatimModuleSyntax` rejects because nothing would be left once types are stripped.
function exportTypeAsDefault(_path: string, lines: string[]): string[] {
  return lines.map((line) =>
    line === 'export default Database;' ? 'export type { Database as default };' : line,
  );
}

const dataDir = mkdtempSync(join(tmpdir(), 'apt-distances-schema-'));
try {
  const db = createDatabase({ kind: 'pglite', dataDir });
  await migrateToLatest(db);
  await db.destroy();

  await processDatabase({
    connection: `file:${dataDir}`,
    schemaNames: ['public'],
    filter: kyselyTypeFilter,
    outputPath: 'src/lib/server/db/schema',
    preDeleteOutputFolder: true,
    typescriptConfig: { enumStyle: 'literal-union', importsExtension: '.ts' },
    generators: [makePgTsGenerator({ preRenderHooks: [makeKyselyHook()] })],
    postRenderHooks: [exportTypeAsDefault],
  });
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
