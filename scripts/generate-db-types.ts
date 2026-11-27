// Regenerates the Kysely types in src/lib/server/db/schema from the migrations. It migrates a
// throwaway PGlite and has Kanel read that, so it needs no Postgres server and never sees data.
//
//   npm run db:types
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makePgTsGenerator, processDatabase } from 'kanel';
import { kyselyCamelCaseHook, kyselyTypeFilter, makeKyselyHook } from 'kanel-kysely';
import { createDatabase } from '#lib/server/db/createDatabase.ts';
import { migrateToLatest } from '#lib/server/db/migrate.ts';

/**
 * Rewrites a line such as `export default Database;` as a type-only export. Kanel and kanel-kysely
 * emit it for a type alias, such as an enum's union, and `verbatimModuleSyntax` rejects it because
 * nothing would be left once types are stripped. Kanel emits nothing but types.
 */
function exportTypeAsDefault(_path: string, lines: string[]): string[] {
  return lines.map((line) =>
    line.replace(/^export default (\w+);$/, 'export type { $1 as default };'),
  );
}

/**
 * Types the write side of `json` and `jsonb` columns as `string` rather than `unknown`. `pg` sends
 * a JS array as a Postgres array literal, which `jsonb` rejects, while PGlite accepts it, so tests
 * would pass where Neon fails. Requiring `string` makes the type checker demand
 * `JSON.stringify(…)`, the form both accept. Kanel types only `json`, `jsonb` and types it doesn't
 * know as `unknown`; kanel-kysely gives a column one type for reads, inserts and updates.
 */
function writeJsonAsString(_path: string, lines: string[]): string[] {
  return lines.map((line) =>
    line.replace(
      /ColumnType<(unknown(?: \| null)?), unknown((?: \| null| \| undefined)?), unknown((?: \| null)?)>/,
      'ColumnType<$1, string$2, string$3>',
    ),
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
    generators: [makePgTsGenerator({ preRenderHooks: [makeKyselyHook(), kyselyCamelCaseHook] })],
    postRenderHooks: [exportTypeAsDefault, writeJsonAsString],
  });
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
